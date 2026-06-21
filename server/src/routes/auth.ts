// Authentication routes — register, login, me

import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { randomUUID } from 'crypto';

const router = express.Router();
const googleClient = new OAuth2Client();

// Validation schema for registration
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1).optional(),
});

/**
 * Support both the old id_token flow (Google One-Tap iframe) and the new
 * access_token flow (useGoogleLogin popup) so existing sessions keep working.
 */
const googleAuthSchema = z.union([
    z.object({ accessToken: z.string().min(1) }),
    z.object({ idToken: z.string().min(1) }),
]);

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }
    return secret;
};

const buildJwt = (user: { id: string; email: string }) => jwt.sign(
    { id: user.id, email: user.email },
    getJwtSecret(),
    { expiresIn: '7d' }
);

const verifyGoogleToken = async (idToken: string): Promise<TokenPayload> => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
        throw new Error('GOOGLE_CLIENT_ID is not configured');
    }

    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
        throw new Error('Invalid Google token');
    }

    if (!payload.email || !payload.email_verified) {
        throw new Error('Google account email is missing or unverified');
    }

    return payload;
};

/**
 * Verify a Google OAuth2 access_token by calling Google's userinfo endpoint.
 * Used by the popup-based useGoogleLogin flow (mobile-friendly).
 */
const verifyGoogleAccessToken = async (
    accessToken: string
): Promise<{ email: string; name?: string; picture?: string }> => {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new Error('Invalid Google access token');
    }

    const data = await response.json() as {
        email?: string;
        email_verified?: boolean;
        name?: string;
        picture?: string;
    };

    if (!data.email || !data.email_verified) {
        throw new Error('Google account email is missing or unverified');
    }

    return { email: data.email, name: data.name, picture: data.picture };
};

// POST /api/auth/register — create a new account
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, name } = registerSchema.parse(req.body);

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                name: name || email.split('@')[0], // Default name from email
                passwordHash: hashedPassword,
            },
        });

        const token = buildJwt(user);

        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Registration failed' });
    }
});

// POST /api/auth/login — authenticate and get token
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = buildJwt(user);

        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// POST /api/auth/google — sign in/up with Google OAuth credential
// Accepts either { accessToken } (popup/useGoogleLogin — mobile-friendly) or
// { idToken } (One-Tap iframe — legacy, kept for backward compatibility).
router.post('/google', async (req: Request, res: Response) => {
    try {
        const body = googleAuthSchema.parse(req.body);

        let email: string;
        let name: string;
        let avatarUrl: string | null;

        if ('accessToken' in body) {
            // New popup flow — verify via userinfo endpoint
            const info = await verifyGoogleAccessToken(body.accessToken);
            email = info.email;
            name = info.name || email.split('@')[0] || 'User';
            avatarUrl = info.picture || null;
        } else {
            // Legacy One-Tap / id_token flow
            const payload = await verifyGoogleToken(body.idToken);
            email = payload.email as string;
            name = payload.name || email.split('@')[0] || 'User';
            avatarUrl = payload.picture || null;
        }

        const existingUser = await prisma.user.findUnique({ where: { email: email } });

        let user;
        if (existingUser) {
            if (avatarUrl && existingUser.avatarUrl !== avatarUrl) {
                user = await prisma.user.update({
                    where: { id: existingUser.id },
                    data: { avatarUrl },
                });
            } else {
                user = existingUser;
            }
        } else {
            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    avatarUrl,
                    // Keep email/password auth model intact without schema changes.
                    passwordHash: await bcrypt.hash(randomUUID(), 10),
                },
            });
        }

        const token = buildJwt(user);
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Google auth failed' });
    }
});

// GET /api/auth/me — get current user profile
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

export default router;

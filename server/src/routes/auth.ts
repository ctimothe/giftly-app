// Authentication routes — register, login, me

import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// Validation schema for registration
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1).optional(),
});

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

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' }
        );

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

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' }
        );

        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
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

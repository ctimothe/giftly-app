// Wishlist CRUD routes with spoiler protection

import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { optionalAuth } from '../middleware/optionalAuth';
import { z } from 'zod';
import { AppError, toAppError } from '../utils/errors';

const router = express.Router();

// Validation schema
const wishlistSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    coverImageUrl: z.string().url().optional().or(z.literal('')),
    theme: z.string().optional(),
    isPublic: z.boolean().optional(),
});

// POST / — Create a new wishlist (auth required)
router.post('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const data = wishlistSchema.parse(req.body);
        const wishlist = await prisma.wishlist.create({
            data: {
                ...data,
                ownerId: req.user!.id,
            },
        });
        res.json(wishlist);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// GET / — Get current user's wishlists (auth required)
// Includes items (for shrine picker) and count
router.get('/', authenticateToken, async (req: Request, res: Response) => {
    const wishlists = await prisma.wishlist.findMany({
        where: { ownerId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        include: {
            _count: { select: { items: true } },
            items: {
                select: {
                    id: true,
                    title: true,
                    imageUrl: true,
                    price: true,
                    hypeCount: true,
                    story: true,
                },
                orderBy: { createdAt: 'desc' },
            },
        },
    });
    res.json(wishlists);
});

// GET /:id — Get specific wishlist (public access, spoiler protection for owner)
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
    try {
        const wishlist = await prisma.wishlist.findUnique({
            where: { id: req.params.id as string },
            include: {
                owner: { select: { id: true, name: true } },
                items: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        contributions: {
                            select: {
                                id: true,
                                amount: true,
                                contributorName: true,
                                message: true,
                                createdAt: true,
                                // Don't expose userId to prevent identification
                            }
                        }
                    }
                },
            },
        });

        if (!wishlist) {
            throw new AppError(404, 'WISHLIST_NOT_FOUND', 'Wishlist not found');
        }

        // Determine if the requester is the owner
        const isOwner = req.user?.id === wishlist.ownerId;

        if (!wishlist.isPublic && !isOwner) {
            throw new AppError(404, 'WISHLIST_NOT_FOUND', 'Wishlist not found');
        }

        if (isOwner) {
            // SPOILER PROTECTION: Owner must NOT see reservation details or contributors
            wishlist.items.forEach((item: any) => {
                item.isReserved = false;     // Hide reservation status
                item.reservedBy = null;      // Hide who reserved
                item.contributions = [];     // Hide all contribution details
                item.collectedAmount = 0;    // Hide how much collected (preserves surprise)
            });
        }

        // Add isOwner flag to response for frontend logic
        res.json({ ...wishlist, isOwner });
    } catch (error) {
        throw toAppError(error, {
            statusCode: 500,
            code: 'WISHLIST_FETCH_FAILED',
            message: 'Failed to fetch wishlist',
        });
    }
});

// PUT /:id — Update wishlist (owner only)
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const wishlist = await prisma.wishlist.findUnique({ where: { id } });

        if (!wishlist || wishlist.ownerId !== req.user!.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const data = wishlistSchema.parse(req.body);
        const updated = await prisma.wishlist.update({
            where: { id },
            data,
        });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: 'Update failed' });
    }
});

// DELETE /:id — Delete wishlist (owner only)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const wishlist = await prisma.wishlist.findUnique({ where: { id } });

        if (!wishlist || wishlist.ownerId !== req.user!.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await prisma.wishlist.delete({ where: { id } });
        res.json({ message: 'Wishlist deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

export default router;

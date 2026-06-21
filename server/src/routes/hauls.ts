// Haul routes — Post-fulfillment diary (rate, review, photo proof)

import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// Validation for creating/updating a haul entry
const haulSchema = z.object({
    itemId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    review: z.string().max(500).optional(),
    photoUrl: z.string().url().optional(),
});

/**
 * POST /api/hauls — Fulfill an item and create a haul diary entry.
 * Marks the item as fulfilled and logs the user's review.
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const data = haulSchema.parse(req.body);

        // Verify item belongs to the authenticated user's wishlist
        const item = await prisma.item.findFirst({
            where: {
                id: data.itemId,
                wishlist: { ownerId: req.user!.id },
            },
        });

        if (!item) {
            return res.status(404).json({ error: 'Item not found or not yours' });
        }

        // Mark item as fulfilled and create the haul entry atomically
        const [_, haul] = await prisma.$transaction([
            prisma.item.update({
                where: { id: data.itemId },
                data: { isFulfilled: true },
            }),
            prisma.haul.create({
                data: {
                    userId: req.user!.id,
                    itemId: data.itemId,
                    rating: data.rating,
                    review: data.review,
                    photoUrl: data.photoUrl,
                },
                include: {
                    item: { select: { title: true, imageUrl: true, price: true } },
                },
            }),
        ]);

        return res.status(201).json(haul);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('Haul create error:', error);
        return res.status(500).json({ error: 'Failed to create haul entry' });
    }
});

/**
 * GET /api/hauls/:userId — Fetch a user's haul diary (public).
 * Returns all fulfilled items with ratings, reviews, and photos.
 */
router.get('/:userId', async (req: Request, res: Response) => {
    try {
        const hauls = await prisma.haul.findMany({
            where: { userId: req.params.userId as string },
            orderBy: { createdAt: 'desc' },
            include: {
                item: {
                    select: {
                        title: true,
                        imageUrl: true,
                        price: true,
                        hypeCount: true,
                    },
                },
            },
        });

        return res.json(hauls);
    } catch (error) {
        console.error('Haul fetch error:', error);
        return res.status(500).json({ error: 'Failed to load hauls' });
    }
});

/**
 * PUT /api/hauls/:id — Update a haul entry (rating, review, photo).
 * Only the owner can edit their own haul.
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const updateSchema = z.object({
            rating: z.number().int().min(1).max(5).optional(),
            review: z.string().max(500).optional(),
            photoUrl: z.string().url().optional(),
        });

        const data = updateSchema.parse(req.body);

        // Verify ownership
        const existing = await prisma.haul.findFirst({
            where: { id: req.params.id as string, userId: req.user!.id },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Haul entry not found' });
        }

        const updated = await prisma.haul.update({
            where: { id: req.params.id as string },
            data,
            include: {
                item: { select: { title: true, imageUrl: true, price: true } },
            },
        });

        return res.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('Haul update error:', error);
        return res.status(500).json({ error: 'Failed to update haul' });
    }
});

export default router;

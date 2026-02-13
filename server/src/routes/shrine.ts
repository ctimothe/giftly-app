// Shrine routes — Manage the user's "Top 4" pinned holy grail items

import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// Max items allowed in the shrine
const SHRINE_LIMIT = 4;

// Validation: array of up to 4 item UUIDs
const shrineSchema = z.object({
    itemIds: z.array(z.string().uuid()).max(SHRINE_LIMIT),
});

/**
 * GET /api/shrine/:userId — Fetch a user's shrine items with full item data.
 * Public endpoint so friends can view another user's shrine.
 */
router.get('/:userId', async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.userId as string },
            select: { shrineItemIds: true, name: true },
        });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Parse the JSON string of item IDs
        const itemIds: string[] = JSON.parse(user.shrineItemIds);

        // Fetch full item details for each pinned item
        const items = await prisma.item.findMany({
            where: { id: { in: itemIds } },
            select: {
                id: true,
                title: true,
                imageUrl: true,
                price: true,
                hypeCount: true,
                story: true,
            },
        });

        // Preserve the user's chosen order
        const ordered = itemIds
            .map(id => items.find(i => i.id === id))
            .filter(Boolean);

        return res.json({ shrine: ordered, userName: user.name });
    } catch (error) {
        console.error('Shrine fetch error:', error);
        return res.status(500).json({ error: 'Failed to load shrine' });
    }
});

/**
 * PUT /api/shrine — Update the authenticated user's shrine.
 * Validates that all item IDs belong to the user's own wishlists.
 */
router.put('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { itemIds } = shrineSchema.parse(req.body);

        // Verify all items belong to the user's wishlists
        if (itemIds.length > 0) {
            const ownedItems = await prisma.item.findMany({
                where: {
                    id: { in: itemIds },
                    wishlist: { ownerId: req.user!.id },
                },
                select: { id: true },
            });

            if (ownedItems.length !== itemIds.length) {
                return res.status(403).json({ error: 'Items must belong to your wishlists' });
            }
        }

        // Persist as JSON string
        await prisma.user.update({
            where: { id: req.user!.id },
            data: { shrineItemIds: JSON.stringify(itemIds) },
        });

        return res.json({ shrine: itemIds });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('Shrine update error:', error);
        return res.status(500).json({ error: 'Failed to update shrine' });
    }
});

export default router;

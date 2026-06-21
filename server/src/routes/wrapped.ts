// Wrapped routes - "Gift Wrapped" stats and vibe analytics

import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { Prisma } from '@prisma/client'; // Keep Prisma import for types

const router = express.Router();

// Contribution shape used for top-contributor analysis
interface ContributionEntry {
    amount: Prisma.Decimal;
    contributorName: string | null;
    userId: string | null;
}

/**
 * GET /api/wrapped/:userId - Generate Spotify-Wrapped-style stats for a user.
 * Public endpoint so users can share their wrapped results.
 */
router.get('/:userId', async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId as string;

        // Fetch user profile
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, karma: true, level: true },
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        // Fetch all items across user's wishlists (include for nested data)
        const wishlists = await prisma.wishlist.findMany({
            where: { ownerId: userId },
            include: {
                items: {
                    include: {
                        contributions: {
                            select: {
                                amount: true,
                                contributorName: true,
                                userId: true,
                            },
                        },
                    },
                },
            },
        });

        // Flatten all items
        const allItems = wishlists.flatMap(wl => wl.items);

        // Calculate "Most Delusional Wish" (most expensive item)
        const mostExpensive = allItems
            .filter(i => i.price)
            .sort((a, b) => Number(b.price) - Number(a.price))[0] || null;

        // Calculate "Most Hyped" (highest hype count)
        const mostHyped = allItems
            .sort((a, b) => b.hypeCount - a.hypeCount)[0] || null;

        // Calculate total wishlist value
        const totalValue = allItems
            .reduce((sum, i) => sum + Number(i.price || 0), 0);

        // Calculate fulfillment rate
        const fulfilledCount = allItems.filter(i => i.isFulfilled).length;
        const fulfillmentRate = allItems.length > 0
            ? Math.round((fulfilledCount / allItems.length) * 100)
            : 0;

        // Find "Top Contributor" (person who gave the most)
        const contributorMap: Record<string, { name: string; total: number }> = {};
        allItems.forEach(item => {
            item.contributions.forEach((c: ContributionEntry) => {
                const key = c.userId || c.contributorName || 'Anonymous';
                const name = c.contributorName || 'Anonymous';
                if (!contributorMap[key]) {
                    contributorMap[key] = { name, total: 0 };
                }
                contributorMap[key].total += Number(c.amount);
            });
        });

        const topContributor = Object.values(contributorMap)
            .sort((a, b) => b.total - a.total)[0] || null;

        // Collect dominant image URLs for "vibe" analysis (client-side color extraction)
        const imageUrls = allItems
            .filter(i => i.imageUrl)
            .map(i => i.imageUrl)
            .slice(0, 12);

        return res.json({
            userName: user.name,
            karma: user.karma,
            level: user.level,
            stats: {
                totalItems: allItems.length,
                totalWishlists: wishlists.length,
                totalValue: Math.round(totalValue * 100) / 100,
                fulfilledCount,
                fulfillmentRate,
                mostExpensive: mostExpensive
                    ? { title: mostExpensive.title, price: Number(mostExpensive.price) }
                    : null,
                mostHyped: mostHyped
                    ? { title: mostHyped.title, hypeCount: mostHyped.hypeCount }
                    : null,
                topContributor,
            },
            imageUrls,
        });
    } catch (error) {
        console.error('Wrapped stats error:', error);
        return res.status(500).json({ error: 'Failed to generate wrapped stats' });
    }
});

export default router;

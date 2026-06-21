// Contribution routes — chip in to expensive gifts (guest-friendly)

import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { optionalAuth } from '../middleware/optionalAuth';
import { z } from 'zod';
import { Server } from 'socket.io';
import { getContributionBounds } from '../services/ContributionService';
import { Prisma } from '@prisma/client';

const router = express.Router();

// Validation schema — supports both logged-in users and guests
const contributionSchema = z.object({
    itemId: z.string().uuid(),
    amount: z.number().positive(),
    message: z.string().optional(),
    nickname: z.string().optional(), // Required for guests
});

// POST / — Add a contribution (guest-friendly with optionalAuth)
router.post('/', optionalAuth, async (req: Request, res: Response) => {
    try {
        const data = contributionSchema.parse(req.body);

        // Determine contributor identity
        const contributorName = req.user?.email || data.nickname;
        if (!contributorName) {
            return res.status(400).json({ error: 'Please provide a nickname' });
        }

        const transactionResult = await prisma.$transaction(async (transaction) => {
            const item = await transaction.item.findUnique({
                where: { id: data.itemId },
                include: { wishlist: true },
            });

            if (!item) {
                throw new Error('Item not found');
            }

            if (req.user?.id === item.wishlist.ownerId) {
                throw new Error('Cannot contribute to your own items');
            }

            if (item.isReserved) {
                throw new Error('Item is already reserved/fully funded');
            }

            const bounds = getContributionBounds({
                requestedAmount: data.amount,
                price: item.price ? Number(item.price) : null,
                collectedAmount: Number(item.collectedAmount),
            });

            const maxCollectedBeforeFundingCap = item.price
                ? new Prisma.Decimal(Number(item.price) - bounds.acceptedAmount)
                : undefined;

            const contribution = await transaction.contribution.create({
                data: {
                    itemId: data.itemId,
                    userId: req.user?.id || null,
                    contributorName,
                    amount: bounds.acceptedAmount,
                    message: data.message,
                },
            });

            const updatedCount = await transaction.item.updateMany({
                where: {
                    id: item.id,
                    isReserved: false,
                    ...(maxCollectedBeforeFundingCap ? { collectedAmount: { lte: maxCollectedBeforeFundingCap } } : {}),
                },
                data: {
                    collectedAmount: {
                        increment: bounds.acceptedAmount,
                    },
                },
            });

            if (updatedCount.count === 0) {
                throw new Error('Contribution exceeds remaining amount');
            }

            const updatedItem = await transaction.item.findUnique({ where: { id: item.id } });
            if (!updatedItem) {
                throw new Error('Item not found');
            }

            const newCollected = Number(updatedItem.collectedAmount);
            const isFullyFunded = updatedItem.price ? newCollected >= Number(updatedItem.price) : false;

            if (isFullyFunded && !updatedItem.isReserved) {
                await transaction.item.update({
                    where: { id: item.id },
                    data: {
                        isReserved: true,
                        reservedBy: 'Group contribution',
                    },
                });
            }

            return {
                contribution,
                wishlistId: item.wishlistId,
                itemId: item.id,
                newCollected,
                isFullyFunded,
            };
        });

        // Emit real-time update to all connected clients
        const io: Server = req.app.get('io');
        if (io) {
            io.to(`wishlist:${transactionResult.wishlistId}`).emit(`wishlist:${transactionResult.wishlistId}`, {
                type: 'CONTRIBUTION_ADDED',
                wishlistId: transactionResult.wishlistId,
                itemId: transactionResult.itemId,
                newCollected: transactionResult.newCollected,
                isFullyFunded: transactionResult.isFullyFunded,
            });
        }

        res.json(transactionResult.contribution);
    } catch (error: any) {
        if (error.message === 'Item not found') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Cannot contribute to your own items') {
            return res.status(403).json({ error: error.message });
        }
        if (error.message === 'Item is already reserved/fully funded') {
            return res.status(400).json({ error: error.message });
        }
        if (
            error.message === 'Item is already fully funded'
            || error.message === 'Contribution exceeds remaining amount'
            || error.message.startsWith('Contribution exceeds remaining amount.')
        ) {
            return res.status(400).json({ error: error.message });
        }

        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

export default router;

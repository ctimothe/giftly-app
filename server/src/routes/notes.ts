// Notes routes — Sticky notes / guestbook on wishlists

import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { optionalAuth } from '../middleware/optionalAuth';
import { z } from 'zod';
import { AppError, toAppError } from '../utils/errors';

const router = express.Router();

// Validation schema for creating a note
const noteSchema = z.object({
    content: z.string().min(1).max(200),
    author: z.string().min(1).max(50),
    color: z.enum(['yellow', 'pink', 'blue', 'green']).optional(),
    posX: z.number().optional(),
    posY: z.number().optional(),
    rotation: z.number().min(-15).max(15).optional(),
});

// GET /api/notes/:wishlistId — Get all notes for a wishlist
router.get('/:wishlistId', async (req: Request, res: Response) => {
    try {
        const notes = await prisma.note.findMany({
            where: { wishlistId: req.params.wishlistId as string },
            orderBy: { createdAt: 'desc' },
        });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// POST /api/notes/:wishlistId — Add a sticky note to a wishlist
router.post('/:wishlistId', optionalAuth, async (req: Request, res: Response) => {
    try {
        const data = noteSchema.parse(req.body);
        // Verify wishlist exists
        const wishlist = await prisma.wishlist.findUnique({
            where: { id: req.params.wishlistId as string },
        });
        if (!wishlist) return res.status(404).json({ error: 'Wishlist not found' });

        // Create the note with a slight random rotation for organic feel
        const note = await prisma.note.create({
            data: {
                ...data,
                wishlistId: req.params.wishlistId as string,
                rotation: data.rotation ?? (Math.random() - 0.5) * 10, // -5° to +5°
            },
        });

        // Broadcast to live viewers via Socket.IO
        const io = req.app.get('io');
        if (io) {
            io.to(`wishlist:${req.params.wishlistId}`).emit('new_note', note);
        }

        res.json(note);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/notes/:noteId — Delete a note (owner only)
router.delete('/:noteId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const note = await prisma.note.findUnique({
            where: { id: req.params.noteId as string },
            include: {
                wishlist: {
                    select: { ownerId: true },
                },
            },
        });

        if (!note) {
            throw new AppError(404, 'NOTE_NOT_FOUND', 'Note not found');
        }

        if (note.wishlist.ownerId !== req.user!.id) {
            throw new AppError(403, 'FORBIDDEN', 'Not authorized to delete this note');
        }

        await prisma.note.delete({
            where: { id: req.params.noteId as string },
        });
        res.json({ message: 'Note deleted' });
    } catch (error) {
        throw toAppError(error, {
            statusCode: 500,
            code: 'NOTE_DELETE_FAILED',
            message: 'Failed to delete note',
        });
    }
});

export default router;

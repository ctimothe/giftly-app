// Item routes — CRUD + URL scraper + reserve/unreserve

import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { optionalAuth } from '../middleware/optionalAuth';
import { z } from 'zod';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Server } from 'socket.io';
import { ItemService } from '../services/ItemService';
import { promises as dns } from 'dns';
import net from 'net';
import { AppError } from '../utils/errors';

const router = express.Router();

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

const isPrivateIpv4 = (ip: string) => {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(Number.isNaN)) return false;

    const [first, second] = parts;
    return (
        first === 10
        || first === 127
        || (first === 172 && second >= 16 && second <= 31)
        || (first === 192 && second === 168)
        || (first === 169 && second === 254)
    );
};

const isPrivateIpv6 = (ip: string) => {
    const normalized = ip.toLowerCase();
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80');
};

const assertPublicUrl = async (rawUrl: string) => {
    let parsed: URL;

    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new AppError(400, 'INVALID_URL', 'Invalid URL');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new AppError(400, 'INVALID_URL_PROTOCOL', 'Only HTTP/HTTPS URLs are allowed');
    }

    if (!parsed.hostname || LOCAL_HOSTNAMES.has(parsed.hostname.toLowerCase())) {
        throw new AppError(400, 'UNSAFE_URL_HOST', 'URL host is not allowed');
    }

    const directIp = net.isIP(parsed.hostname);
    if (directIp === 4 && isPrivateIpv4(parsed.hostname)) {
        throw new AppError(400, 'UNSAFE_URL_HOST', 'URL host is not allowed');
    }
    if (directIp === 6 && isPrivateIpv6(parsed.hostname)) {
        throw new AppError(400, 'UNSAFE_URL_HOST', 'URL host is not allowed');
    }

    const resolvedAddresses = await dns.lookup(parsed.hostname, { all: true });
    const hasPrivateAddress = resolvedAddresses.some((address) => {
        if (address.family === 4) {
            return isPrivateIpv4(address.address);
        }
        return isPrivateIpv6(address.address);
    });

    if (hasPrivateAddress) {
        throw new AppError(400, 'UNSAFE_URL_HOST', 'URL host is not allowed');
    }

    return parsed.toString();
};

// Validation for adding items (URL is optional for manual entry)
const itemSchema = z.object({
    wishlistId: z.string(),
    url: z.string().optional(),
    title: z.string().min(1),
    price: z.number().positive().optional(),
    imageUrl: z.string().optional(),
    currency: z.string().default('USD'),
    story: z.string().max(500).optional(),
});

// POST /preview — Scrape URL for auto-fill (auth required)
router.post('/preview', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { url } = req.body;
        if (!url || typeof url !== 'string') {
            throw new AppError(400, 'URL_REQUIRED', 'URL required');
        }

        const safeUrl = await assertPublicUrl(url);

        // Fetch the page and extract OpenGraph metadata
        const { data } = await axios.get(safeUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (SocialWishlistBot)' },
            timeout: 5000,
            maxContentLength: 2 * 1024 * 1024,
            maxBodyLength: 2 * 1024 * 1024,
        });
        const $ = cheerio.load(data);

        const title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
        const image = $('meta[property="og:image"]').attr('content') || '';
        const description = $('meta[property="og:description"]').attr('content') || '';

        // Attempt to extract price from structured data
        let price: number | undefined;
        const priceFromMeta = $('meta[property="product:price:amount"]').attr('content')
            || $('meta[property="og:price:amount"]').attr('content');
        if (priceFromMeta) {
            price = parseFloat(priceFromMeta);
        }

        res.json({ title, image, description, url: safeUrl, price });
    } catch (error: any) {
        if (error instanceof AppError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to scrape URL' });
    }
});

// POST / — Add item to wishlist (owner only)
router.post('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const data = itemSchema.parse(req.body);
        const io: Server = req.app.get('io');

        const item = await ItemService.createItem(req.user!.id, data, io);
        res.json(item);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// POST /:id/reserve — Reserve an item (guest-friendly via optionalAuth)
router.post('/:id/reserve', optionalAuth, async (req: Request, res: Response) => {
    try {
        const itemId = req.params.id as string;
        const { nickname } = req.body;
        const reservedBy = req.user?.email || nickname;

        if (!reservedBy) {
            return res.status(400).json({ error: 'Please provide a nickname' });
        }

        const io: Server = req.app.get('io');
        await ItemService.reserveItem(itemId, reservedBy, req.user?.id, io);

        res.json({ message: 'Item reserved!' });
    } catch (error: any) {
        // Map common service errors to status codes
        if (error.message === 'Item not found') return res.status(404).json({ error: error.message });
        if (error.message === 'Cannot reserve your own items') return res.status(403).json({ error: error.message });
        res.status(400).json({ error: error.message || 'Failed to reserve item' });
    }
});

// POST /:id/unreserve — Remove reservation (only the reserver can do this)
router.post('/:id/unreserve', optionalAuth, async (req: Request, res: Response) => {
    try {
        const itemId = req.params.id as string;
        const { nickname } = req.body;
        const requesterIdentifier = req.user?.email || nickname;
        const io: Server = req.app.get('io');

        await ItemService.unreserveItem(itemId, requesterIdentifier, io);

        res.json({ message: 'Item unreserved' });
    } catch (error: any) {
        if (error.message === 'Item not found') return res.status(404).json({ error: error.message });
        if (error.message.includes('Only the person')) return res.status(403).json({ error: error.message });
        res.status(500).json({ error: 'Failed to unreserve item' });
    }
});

// DELETE /:id — Delete item (owner only)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const itemId = req.params.id as string;
        const io: Server = req.app.get('io');

        await ItemService.deleteItem(itemId, req.user!.id, io);

        res.json({ message: 'Item deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Delete failed' });
    }
});

// POST /:id/hype — Increment hype count and broadcast to viewers
router.post('/:id/hype', optionalAuth, async (req: Request, res: Response) => {
    try {
        const itemId = req.params.id as string;
        const io: Server = req.app.get('io');

        const item = await ItemService.hypeItem(itemId, io);

        res.json({ hypeCount: item.hypeCount });
    } catch (error) {
        res.status(500).json({ error: 'Failed to hype item' });
    }
});

// POST /:id/steal — Clone an item to the authenticated user's default wishlist
router.post('/:id/steal', authenticateToken, async (req: Request, res: Response) => {
    try {
        const itemId = req.params.id as string;

        // Fetch the original item + its owner's username
        const original = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
                wishlist: {
                    include: { owner: { select: { name: true } } },
                },
            },
        });

        if (!original) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Prevent stealing your own item
        if (original.wishlist.ownerId === req.user!.id) {
            return res.status(400).json({ error: 'Cannot steal your own item' });
        }

        // Find (or create) the user's default wishlist
        let targetWishlist = await prisma.wishlist.findFirst({
            where: { ownerId: req.user!.id },
            orderBy: { createdAt: 'asc' },
        });

        if (!targetWishlist) {
            targetWishlist = await prisma.wishlist.create({
                data: {
                    ownerId: req.user!.id,
                    title: 'My Wishlist',
                },
            });
        }

        // Build provenance chain: keep original stolenFrom or set to owner
        const provenance = original.stolenFrom || original.wishlist.owner.name || 'someone';

        // Clone the item into the user's wishlist
        const cloned = await prisma.item.create({
            data: {
                wishlistId: targetWishlist.id,
                title: original.title,
                url: original.url,
                imageUrl: original.imageUrl,
                price: original.price,
                currency: original.currency,
                story: original.story,
                stolenFrom: provenance,
            },
        });

        return res.status(201).json(cloned);
    } catch (error) {
        console.error('Steal item error:', error);
        return res.status(500).json({ error: 'Failed to steal item' });
    }
});

export default router;

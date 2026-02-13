
import prisma from '../lib/prisma';
import { Server } from 'socket.io';

interface CreateItemDTO {
    wishlistId: string;
    title: string;
    url?: string;
    imageUrl?: string;
    price?: number;
    currency?: string;
    story?: string;
}

export class ItemService {
    /**
     * Create a new item and notify clients
     */
    static async createItem(userId: string, data: CreateItemDTO, io?: Server) {
        // Verify ownership
        const wishlist = await prisma.wishlist.findUnique({ where: { id: data.wishlistId } });
        if (!wishlist || wishlist.ownerId !== userId) {
            throw new Error('Not authorized to add to this wishlist');
        }

        const item = await prisma.item.create({
            data: {
                wishlistId: data.wishlistId,
                title: data.title,
                url: data.url,
                imageUrl: data.imageUrl,
                price: data.price ? Number(data.price) : undefined,
                currency: data.currency || 'USD',
                story: data.story,
            },
        });

        if (io) {
            io.emit(`wishlist:${data.wishlistId}`, {
                type: 'ITEM_ADDED',
                wishlistId: data.wishlistId,
                item,
            });
        }

        return item;
    }

    /**
     * Reserve an item
     */
    static async reserveItem(itemId: string, reserverIdentifier: string, reserverId: string | undefined, io?: Server) {
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: { wishlist: true },
        });

        if (!item) throw new Error('Item not found');
        if (reserverId === item.wishlist.ownerId) throw new Error('Cannot reserve your own items');
        const reservationResult = await prisma.item.updateMany({
            where: {
                id: itemId,
                isReserved: false,
            },
            data: { isReserved: true, reservedBy: reserverIdentifier },
        });

        if (reservationResult.count === 0) {
            throw new Error('Item is already reserved');
        }

        const updated = await prisma.item.findUnique({
            where: { id: itemId },
        });

        if (!updated) {
            throw new Error('Item not found');
        }

        if (io) {
            io.emit(`wishlist:${item.wishlistId}`, {
                type: 'ITEM_RESERVED',
                wishlistId: item.wishlistId,
                itemId,
                isReserved: true,
                reservedBy: reserverIdentifier,
            });
        }

        return updated;
    }

    /**
     * Unreserve an item
     */
    static async unreserveItem(itemId: string, requesterIdentifier: string, io?: Server) {
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: { wishlist: true },
        });

        if (!item) throw new Error('Item not found');
        if (!requesterIdentifier) throw new Error('Only the person who reserved can unreserve');

        const unreserveResult = await prisma.item.updateMany({
            where: {
                id: itemId,
                reservedBy: requesterIdentifier,
                isReserved: true,
            },
            data: { isReserved: false, reservedBy: null },
        });

        if (unreserveResult.count === 0) {
            throw new Error('Only the person who reserved can unreserve');
        }

        const updated = await prisma.item.findUnique({ where: { id: itemId } });
        if (!updated) {
            throw new Error('Item not found');
        }

        if (io) {
            io.emit(`wishlist:${item.wishlistId}`, {
                type: 'ITEM_UNRESERVED',
                wishlistId: item.wishlistId,
                itemId,
                isReserved: false,
                reservedBy: null,
            });
        }

        return updated;
    }

    /**
     * Delete an item
     */
    static async deleteItem(itemId: string, userId: string, io?: Server) {
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: { wishlist: true }
        });

        if (!item || item.wishlist.ownerId !== userId) {
            throw new Error('Not authorized to delete this item');
        }

        await prisma.item.delete({ where: { id: itemId } });

        if (io) {
            io.emit(`wishlist:${item.wishlistId}`, {
                type: 'ITEM_DELETED',
                wishlistId: item.wishlistId,
                itemId,
            });
        }
    }

    /**
     * Hype an item
     */
    static async hypeItem(itemId: string, io?: Server) {
        const item = await prisma.item.update({
            where: { id: itemId },
            data: { hypeCount: { increment: 1 } },
        });

        if (io) {
            io.to(`wishlist:${item.wishlistId}`).emit('hype', {
                itemId,
                hypeCount: item.hypeCount,
            });
        }

        return item;
    }
}

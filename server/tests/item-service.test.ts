import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AppError } from '../src/utils/errors';

vi.mock('../src/lib/prisma', () => ({
    default: {
        item: {
            findUnique: vi.fn(),
            delete: vi.fn(),
        },
        contribution: {
            findMany: vi.fn(),
        },
    },
}));

import prisma from '../src/lib/prisma';
import { ItemService } from '../src/services/ItemService';

const prismaMock = prisma as unknown as {
    item: {
        findUnique: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
    };
    contribution: {
        findMany: ReturnType<typeof vi.fn>;
    };
};

describe('ItemService.deleteItem', () => {
    beforeEach(() => {
        prismaMock.item.findUnique.mockReset();
        prismaMock.item.delete.mockReset();
        prismaMock.contribution.findMany.mockReset();
    });

    it('rejects deletion when requester is not owner', async () => {
        prismaMock.item.findUnique.mockResolvedValueOnce({
            id: 'item-1',
            wishlistId: 'wl-1',
            wishlist: { ownerId: 'owner-1' },
        });

        await expect(ItemService.deleteItem('item-1', 'owner-2')).rejects.toThrow('Not authorized to delete this item');
    });

    it('requires confirmation when contributors exist', async () => {
        prismaMock.item.findUnique.mockResolvedValueOnce({
            id: 'item-1',
            wishlistId: 'wl-1',
            wishlist: { ownerId: 'owner-1' },
        });
        prismaMock.contribution.findMany.mockResolvedValueOnce([
            { userId: 'u-1', contributorName: null },
            { userId: 'u-1', contributorName: null },
            { userId: null, contributorName: 'Alex' },
        ]);

        await expect(ItemService.deleteItem('item-1', 'owner-1')).rejects.toMatchObject({
            statusCode: 409,
            code: 'ITEM_DELETE_CONFIRMATION_REQUIRED',
            details: { contributorCount: 2 },
        } satisfies Partial<AppError>);
    });

    it('deletes item after force confirmation and returns contributor count', async () => {
        prismaMock.item.findUnique.mockResolvedValueOnce({
            id: 'item-1',
            wishlistId: 'wl-1',
            wishlist: { ownerId: 'owner-1' },
        });
        prismaMock.contribution.findMany.mockResolvedValueOnce([
            { userId: 'u-1', contributorName: null },
            { userId: null, contributorName: 'Alex' },
        ]);
        prismaMock.item.delete.mockResolvedValueOnce({ id: 'item-1' });
        const io = { emit: vi.fn() };

        const result = await ItemService.deleteItem('item-1', 'owner-1', io as never, { force: true });

        expect(prismaMock.item.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
        expect(result.contributorCount).toBe(2);
        expect(io.emit).toHaveBeenCalledWith('wishlist:wl-1', {
            type: 'ITEM_DELETED',
            wishlistId: 'wl-1',
            itemId: 'item-1',
        });
    });
});

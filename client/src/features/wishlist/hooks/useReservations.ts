import { useState } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import type { Item, Wishlist } from '../types';

interface UseReservationsArgs {
    wishlist: Wishlist | null;
    token: string | null;
    userEmail?: string;
    guestNickname: string;
    updateItemInState: (itemId: string, updater: (item: Item) => Item) => void;
    getApiErrorMessage: (error: unknown, fallback: string) => string;
}

export const useReservations = ({
    wishlist,
    token,
    userEmail,
    guestNickname,
    updateItemInState,
    getApiErrorMessage,
}: UseReservationsArgs) => {
    const [pendingReserveIds, setPendingReserveIds] = useState<string[]>([]);

    const reserveItem = async (itemId: string) => {
        if (pendingReserveIds.includes(itemId)) return;

        const reserverIdentifier = userEmail || guestNickname;
        const previousItem = wishlist?.items.find(item => item.id === itemId);
        if (!previousItem) return;

        setPendingReserveIds(prev => [...prev, itemId]);
        updateItemInState(itemId, item => ({
            ...item,
            isReserved: true,
            reservedBy: reserverIdentifier,
        }));

        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.post(`/api/items/${itemId}/reserve`, {
                nickname: guestNickname || undefined,
            }, { headers });
            toast.success('You reserved this gift! Remember to buy it!');
            confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
        } catch (error: unknown) {
            updateItemInState(itemId, () => previousItem);
            toast.error(getApiErrorMessage(error, 'Failed to reserve'));
        } finally {
            setPendingReserveIds(prev => prev.filter(id => id !== itemId));
        }
    };

    const unreserveItem = async (itemId: string) => {
        if (pendingReserveIds.includes(itemId)) return;

        const previousItem = wishlist?.items.find(item => item.id === itemId);
        if (!previousItem) return;

        setPendingReserveIds(prev => [...prev, itemId]);
        updateItemInState(itemId, item => ({
            ...item,
            isReserved: false,
            reservedBy: undefined,
        }));

        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.post(`/api/items/${itemId}/unreserve`, {
                nickname: guestNickname || undefined,
            }, { headers });
            toast.success('Reservation cancelled');
        } catch (error: unknown) {
            updateItemInState(itemId, () => previousItem);
            toast.error(getApiErrorMessage(error, 'Failed to unreserve'));
        } finally {
            setPendingReserveIds(prev => prev.filter(id => id !== itemId));
        }
    };

    return {
        pendingReserveIds,
        reserveItem,
        unreserveItem,
    };
};

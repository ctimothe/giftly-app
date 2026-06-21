import { useMemo, useState } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import type { Item, Wishlist } from '../types';
import { toCurrency } from '../helpers';

interface UseContributionsArgs {
    wishlist: Wishlist | null;
    token: string | null;
    guestNickname: string;
    updateItemInState: (itemId: string, updater: (item: Item) => Item) => void;
    getApiErrorMessage: (error: unknown, fallback: string) => string;
}

export const useContributions = ({
    wishlist,
    token,
    guestNickname,
    updateItemInState,
    getApiErrorMessage,
}: UseContributionsArgs) => {
    const [contributeOpen, setContributeOpen] = useState(false);
    const [contributeItemId, setContributeItemId] = useState('');
    const [contributeAmount, setContributeAmount] = useState('');
    const [contributeMessage, setContributeMessage] = useState('');
    const [contributeLoading, setContributeLoading] = useState(false);

    const contributeItem = useMemo(
        () => wishlist?.items.find(item => item.id === contributeItemId),
        [wishlist?.items, contributeItemId]
    );

    const openContributeDialog = (itemId: string) => {
        setContributeItemId(itemId);
        setContributeAmount('');
        setContributeMessage('');
        setContributeOpen(true);
    };

    const submitContribution = async () => {
        const parsedAmount = Number(contributeAmount);
        if (!contributeAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            toast.error('Enter a valid amount');
            return;
        }

        const targetItem = wishlist?.items.find(item => item.id === contributeItemId);
        if (!targetItem) {
            toast.error('Item not found');
            return;
        }

        if (targetItem.price) {
            const remaining = Math.max(Number(targetItem.price) - Number(targetItem.collectedAmount), 0);
            if (remaining <= 0) {
                toast.error('This item is already fully funded');
                return;
            }
            if (parsedAmount > remaining) {
                toast.error(`Max contribution is $${toCurrency(remaining)} (remaining amount)`);
                return;
            }
        }

        const previousItem = { ...targetItem };
        const nextCollectedAmount = targetItem.price
            ? Math.min(Number(targetItem.collectedAmount) + parsedAmount, Number(targetItem.price))
            : Number(targetItem.collectedAmount) + parsedAmount;
        const nextIsReserved = targetItem.price
            ? nextCollectedAmount >= Number(targetItem.price)
            : targetItem.isReserved;

        setContributeLoading(true);
        updateItemInState(contributeItemId, item => ({
            ...item,
            collectedAmount: nextCollectedAmount,
            isReserved: nextIsReserved,
            reservedBy: nextIsReserved ? 'Group contribution' : item.reservedBy,
        }));

        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.post('/api/contributions', {
                itemId: contributeItemId,
                amount: parsedAmount,
                message: contributeMessage || undefined,
                nickname: guestNickname || undefined,
            }, { headers });
            toast.success('Contribution added!');
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            setContributeOpen(false);
        } catch (error: unknown) {
            updateItemInState(contributeItemId, () => previousItem);
            toast.error(getApiErrorMessage(error, 'Failed to contribute'));
        } finally {
            setContributeLoading(false);
        }
    };

    return {
        contributeOpen,
        setContributeOpen,
        contributeItemId,
        contributeAmount,
        setContributeAmount,
        contributeMessage,
        setContributeMessage,
        contributeLoading,
        contributeItem,
        openContributeDialog,
        submitContribution,
    };
};

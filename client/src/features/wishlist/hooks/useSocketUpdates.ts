import { useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import type { CreateIntent, Wishlist } from '../types';

interface UseSocketUpdatesArgs {
    wishlistId?: string;
    setWishlist: React.Dispatch<React.SetStateAction<Wishlist | null>>;
    setViewerCount: React.Dispatch<React.SetStateAction<number>>;
    addActivity: (type: string, message: string) => void;
    isOwnerRef: React.MutableRefObject<boolean>;
    createIntentsRef: React.MutableRefObject<Map<string, CreateIntent>>;
}

interface WishlistSocketEvent {
    type: string;
    item?: {
        id?: string;
        title?: string;
        url?: string;
        price?: number | null;
        [key: string]: unknown;
    };
    itemId?: string;
    isReserved?: boolean;
    reservedBy?: string | null;
    newCollected?: number;
    isFullyFunded?: boolean;
}

export const useSocketUpdates = ({
    wishlistId,
    setWishlist,
    setViewerCount,
    addActivity,
    isOwnerRef,
    createIntentsRef,
}: UseSocketUpdatesArgs) => {
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!wishlistId) {
            return;
        }

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        socketRef.current = io(API_URL);
        socketRef.current.emit('join_wishlist', { wishlistId });

        socketRef.current.on(`viewers:${wishlistId}`, (data: { count: number }) => {
            setViewerCount(data.count);
        });

        socketRef.current.on(`wishlist:${wishlistId}`, (data: WishlistSocketEvent) => {
            if (data.type === 'ITEM_ADDED') {
                const incomingItemId = data.item?.id;
                if (!incomingItemId) {
                    return;
                }

                setWishlist(prev => {
                    if (!prev) return prev;
                    if (prev.items.some(item => item.id === incomingItemId)) return prev;

                    if (isOwnerRef.current) {
                        const tempIndex = prev.items.findIndex((item) => {
                            if (!item.id.startsWith('temp-')) return false;
                            const intent = createIntentsRef.current.get(item.id);
                            if (!intent) return false;

                            const sameTitle = intent.title.trim().toLowerCase() === String(data.item?.title || '').trim().toLowerCase();
                            const sameUrl = (intent.url || '') === (data.item?.url || '');
                            const samePrice = Number(intent.price ?? 0) === Number(data.item?.price ?? 0);
                            return sameTitle && sameUrl && samePrice;
                        });

                        if (tempIndex >= 0) {
                            const tempItem = prev.items[tempIndex];
                            createIntentsRef.current.delete(tempItem.id);
                            const next = [...prev.items];
                            next[tempIndex] = { ...data.item, id: incomingItemId, localKey: tempItem.localKey || tempItem.id } as typeof next[number];
                            return { ...prev, items: next };
                        }
                    }

                    return { ...prev, items: [{ ...data.item, id: incomingItemId, localKey: incomingItemId } as typeof prev.items[number], ...prev.items] };
                });

                if (!isOwnerRef.current) {
                    toast.info('A new item was added!');
                    addActivity('added', 'A new item was added');
                }
                return;
            }

            if (data.type === 'ITEM_DELETED') {
                if (!data.itemId) return;
                setWishlist(prev => {
                    if (!prev) return prev;
                    return { ...prev, items: prev.items.filter(item => item.id !== data.itemId) };
                });
                toast.info('An item was removed');
                addActivity('deleted', 'An item was removed');
                return;
            }

            if (data.type === 'ITEM_RESERVED' || data.type === 'ITEM_UNRESERVED') {
                if (!data.itemId) return;
                setWishlist(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        items: prev.items.map(item => (
                            item.id === data.itemId
                                ? { ...item, isReserved: Boolean(data.isReserved), reservedBy: data.reservedBy || undefined }
                                : item
                        )),
                    };
                });

                if (!isOwnerRef.current) {
                    if (data.type === 'ITEM_RESERVED') {
                        toast.info('An item was just reserved!');
                        addActivity('reserved', 'A gift was reserved');
                    } else {
                        toast.info('A reservation was cancelled');
                        addActivity('unreserved', 'A reservation was cancelled');
                    }
                }
                return;
            }

            if (data.type === 'CONTRIBUTION_ADDED') {
                if (!data.itemId) return;
                setWishlist(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        items: prev.items.map(item => {
                            if (item.id !== data.itemId) return item;
                            return {
                                ...item,
                                collectedAmount: data.newCollected ?? item.collectedAmount,
                                isReserved: data.isFullyFunded ? true : item.isReserved,
                                reservedBy: data.isFullyFunded ? 'Group contribution' : item.reservedBy,
                            };
                        }),
                    };
                });

                if (!isOwnerRef.current) {
                    toast.success('Someone just chipped in!');
                    addActivity('contribution', 'Someone chipped in to a gift');
                    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
                }
            }
        });

        socketRef.current.on('hype', (data: { itemId: string; hypeCount: number }) => {
            setWishlist(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    items: prev.items.map(item => (
                        item.id === data.itemId
                            ? { ...item, hypeCount: data.hypeCount }
                            : item
                    )),
                };
            });
        });

        return () => {
            socketRef.current?.emit('leave_wishlist', { wishlistId });
            socketRef.current?.disconnect();
        };
    }, [wishlistId, setWishlist, setViewerCount, addActivity, isOwnerRef, createIntentsRef]);
};

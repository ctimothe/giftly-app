// WishlistPage — Premium wishlist view with Owner/Friend modes
// Features: hero gradient banner, glassmorphic cards, live presence, activity feed, hype, story

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Loader2, Plus, Gift, Link as LinkIcon, Copy, Trash2, ShieldCheck,
    DollarSign, Users, Eye, MessageCircle, Activity, Lock, Coins, Flame
} from 'lucide-react';
import io, { Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import BackButton from '@/components/ui/BackButton';

// --- Gradient theme presets (matching Dashboard) ---
const THEME_PRESETS: Record<string, { from: string; to: string }> = {
    'violet-pink': { from: '#7c3aed', to: '#ec4899' },
    'blue-cyan': { from: '#2563eb', to: '#06b6d4' },
    'amber-orange': { from: '#f59e0b', to: '#ef4444' },
    'green-teal': { from: '#10b981', to: '#14b8a6' },
    'rose-red': { from: '#f43f5e', to: '#e11d48' },
    'slate-indigo': { from: '#6366f1', to: '#4338ca' },
};

// Item shape from API
interface Item {
    id: string;
    localKey?: string;
    title: string;
    price: number | null;
    imageUrl?: string;
    url?: string;
    story?: string;
    collectedAmount: number;
    isReserved: boolean;
    reservedBy?: string;
    hypeCount: number;
    stolenFrom?: string | null;
    contributions: any[];
}

interface CreateIntent {
    title: string;
    url?: string;
    price?: number | null;
}

// Wishlist shape from API
interface Wishlist {
    id: string;
    title: string;
    theme?: string;
    ownerId: string;
    isOwner: boolean;
    owner: { id: string; name: string };
    items: Item[];
}

// Activity feed event
interface ActivityEvent {
    id: string;
    type: string;
    message: string;
    time: Date;
}

const getWishlistCacheKey = (wishlistId?: string, userKey?: string) => `giftly:wishlist:${wishlistId || 'unknown'}:${userKey || 'guest'}`;

export default function WishlistPage() {
    const { id } = useParams<{ id: string }>();
    const { user, token } = useAuth();
    const [wishlist, setWishlist] = useState<Wishlist | null>(null);
    const [loading, setLoading] = useState(true);

    // Add Item State (owner only)
    const [addItemOpen, setAddItemOpen] = useState(false);
    const [itemTitle, setItemTitle] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    const [itemUrl, setItemUrl] = useState('');
    const [itemImage, setItemImage] = useState('');
    const [itemStory, setItemStory] = useState('');
    const [scraping, setScraping] = useState(false);
    const [submittingItem, setSubmittingItem] = useState(false);

    // Guest nickname state
    const [guestNickname, setGuestNickname] = useState('');
    const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'reserve' | 'contribute' | 'hype'; itemId: string } | null>(null);

    // Contribution dialog state
    const [contributeOpen, setContributeOpen] = useState(false);
    const [contributeItemId, setContributeItemId] = useState('');
    const [contributeAmount, setContributeAmount] = useState('');
    const [contributeMessage, setContributeMessage] = useState('');
    const [contributeLoading, setContributeLoading] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const [pendingReserveIds, setPendingReserveIds] = useState<string[]>([]);
    const [pendingHypeIds, setPendingHypeIds] = useState<string[]>([]);

    // Live presence: viewer count
    const [viewerCount, setViewerCount] = useState(1);

    // Activity feed log
    const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);
    const [showActivity, setShowActivity] = useState(false);

    const socketRef = useRef<Socket | null>(null);
    const isFetching = useRef(false);
    const previewRequestCounter = useRef(0);
    const isOwnerRef = useRef(false);
    const createIntentsRef = useRef<Map<string, CreateIntent>>(new Map());
    const hadCachedWishlistRef = useRef(false);

    const wishlistCacheKey = getWishlistCacheKey(id, user?.id || undefined);

    useEffect(() => {
        isOwnerRef.current = Boolean(wishlist?.isOwner);
    }, [wishlist?.isOwner]);

    const getApiErrorMessage = (error: any, fallback: string) => {
        return error?.response?.data?.error?.message
            || error?.response?.data?.error
            || fallback;
    };

    const updateItemInState = useCallback((itemId: string, updater: (item: Item) => Item) => {
        setWishlist(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                items: prev.items.map(item => item.id === itemId ? updater(item) : item),
            };
        });
    }, []);

    // Add an event to the activity feed
    const addActivity = useCallback((type: string, message: string) => {
        setActivityLog(prev => [{
            id: Date.now().toString(),
            type,
            message,
            time: new Date()
        }, ...prev].slice(0, 20)); // Keep max 20 events
    }, []);

    // Fetch wishlist data from API — Guarded to prevent parallel redundant calls
    const fetchWishlist = useCallback(async () => {
        if (isFetching.current) return;
        isFetching.current = true;
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.get(`/api/wishlists/${id}`, { headers });
            setWishlist(res.data);
            sessionStorage.setItem(wishlistCacheKey, JSON.stringify(res.data));
            if (res.data.title) document.title = `${res.data.title} | Giftly`;
        } catch (error) {
            if (!hadCachedWishlistRef.current) {
                toast.error('Failed to load wishlist');
            }
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [id, token, wishlistCacheKey]);

    // Connect to WebSocket and fetch wishlist data
    useEffect(() => {
        const cached = sessionStorage.getItem(wishlistCacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached) as Wishlist;
                if (parsed && parsed.id) {
                    hadCachedWishlistRef.current = true;
                    setWishlist(parsed);
                    setLoading(false);
                }
            } catch {
                sessionStorage.removeItem(wishlistCacheKey);
            }
        }

        fetchWishlist();

        // WebSocket connection for real-time updates + presence
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        socketRef.current = io(API_URL);

        // Join the wishlist room for presence tracking
        socketRef.current.emit('join_wishlist', { wishlistId: id });

        // Listen for viewer count updates
        socketRef.current.on(`viewers:${id}`, (data: { count: number }) => {
            setViewerCount(data.count);
        });

        // Listen for all wishlist events and refetch (guarded)
        // Listen for all wishlist events and UPDATE LOCAL STATE (No refetch!)
        socketRef.current.on(`wishlist:${id}`, (data: any) => {
            // 1. Handle Item Added
            if (data.type === 'ITEM_ADDED') {
                setWishlist(prev => {
                    if (!prev) return prev;
                    if (prev.items.some(i => i.id === data.item.id)) return prev; // Dedup

                    if (isOwnerRef.current) {
                        const tempIndex = prev.items.findIndex((item) => {
                            if (!item.id.startsWith('temp-')) return false;
                            const intent = createIntentsRef.current.get(item.id);
                            if (!intent) return false;

                            const sameTitle = intent.title.trim().toLowerCase() === String(data.item.title || '').trim().toLowerCase();
                            const sameUrl = (intent.url || '') === (data.item.url || '');
                            const samePrice = Number(intent.price ?? 0) === Number(data.item.price ?? 0);

                            return sameTitle && sameUrl && samePrice;
                        });

                        if (tempIndex >= 0) {
                            const tempItem = prev.items[tempIndex];
                            createIntentsRef.current.delete(tempItem.id);
                            const next = [...prev.items];
                            next[tempIndex] = { ...data.item, localKey: tempItem.localKey || tempItem.id };
                            return { ...prev, items: next };
                        }
                    }

                    return { ...prev, items: [{ ...data.item, localKey: data.item.id }, ...prev.items] };
                });
                if (!isOwnerRef.current) {
                    toast.info('A new item was added!');
                    addActivity('added', 'A new item was added');
                }
            }
            // 2. Handle Item Deleted
            else if (data.type === 'ITEM_DELETED') {
                setWishlist(prev => {
                    if (!prev) return prev;
                    return { ...prev, items: prev.items.filter(i => i.id !== data.itemId) };
                });
                toast.info('An item was removed');
                addActivity('deleted', 'An item was removed');
            }
            // 3. Handle Reservation Changes
            else if (data.type === 'ITEM_RESERVED' || data.type === 'ITEM_UNRESERVED') {
                setWishlist(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        items: prev.items.map(item =>
                            item.id === data.itemId
                                ? { ...item, isReserved: data.isReserved, reservedBy: data.reservedBy }
                                : item
                        )
                    };
                });
                if (data.type === 'ITEM_RESERVED') {
                    if (!isOwnerRef.current) {
                        toast.info('An item was just reserved!');
                        addActivity('reserved', 'A gift was reserved');
                    }
                } else {
                    if (!isOwnerRef.current) {
                        toast.info('A reservation was cancelled');
                        addActivity('unreserved', 'A reservation was cancelled');
                    }
                }
            }
            // 4. Handle Contributions (still need refetch for complex math/progress if detailed data isn't sent, 
            //    but for now we can just increment collectedAmount if we trust the delta, 
            //    OR just refetch for this complex case only).
            //    Let's keep it safe and refetch ONLY for money stuff for now, or just notify.
            else if (data.type === 'CONTRIBUTION_ADDED') {
                setWishlist(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        items: prev.items.map(item => {
                            if (item.id !== data.itemId) return item;
                            return {
                                ...item,
                                collectedAmount: data.newCollected ?? item.collectedAmount,
                                isReserved: Boolean(data.isFullyFunded) ? true : item.isReserved,
                                reservedBy: Boolean(data.isFullyFunded) ? 'Group contribution' : item.reservedBy,
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

        // Optimized real-time update for hype (direct state patch)
        socketRef.current.on('hype', (data: { itemId: string, hypeCount: number }) => {
            setWishlist(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    items: prev.items.map(item =>
                        item.id === data.itemId ? { ...item, hypeCount: data.hypeCount } : item
                    )
                };
            });
        });

        return () => {
            // Leave room and disconnect on unmount
            socketRef.current?.emit('leave_wishlist', { wishlistId: id });
            socketRef.current?.disconnect();
        };
    }, [id, addActivity, fetchWishlist, wishlistCacheKey]);

    // Auto-fill item details from URL (scraping)
    const handleUrlPaste = async (val: string) => {
        setItemUrl(val);
        if (val.startsWith('http')) {
            const requestId = ++previewRequestCounter.current;
            setScraping(true);
            try {
                // Use preview endpoint which handles scraping
                const res = await axios.post('/api/items/preview', { url: val }, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                if (requestId !== previewRequestCounter.current) {
                    return;
                }
                if (res.data.title) setItemTitle(res.data.title);
                if (res.data.price) setItemPrice(String(res.data.price));
                if (res.data.image) setItemImage(res.data.image);
            } catch {
                // Scraping failed — user fills manually
            } finally {
                if (requestId === previewRequestCounter.current) {
                    setScraping(false);
                }
            }
        }
    };

    // Add item to wishlist
    // Add item to wishlist (Optimistic UI)
    const addItem = async () => {
        if (submittingItem) return;
        if (!itemTitle.trim()) {
            toast.error('Item title is required');
            return;
        }

        const payload = {
            wishlistId: id,
            title: itemTitle.trim(),
            price: itemPrice ? Number(itemPrice) : undefined,
            url: itemUrl || undefined,
            imageUrl: itemImage || undefined,
            story: itemStory || undefined,
        };

        // 1. Create temporary optimistic item
        const tempId = `temp-${Date.now()}`;
        const optimisticItem: Item = {
            id: tempId,
            localKey: tempId,
            title: payload.title,
            price: payload.price ?? null,
            url: payload.url,
            imageUrl: payload.imageUrl,
            story: payload.story,
            collectedAmount: 0,
            isReserved: false,
            hypeCount: 0,
            contributions: []
        };

        createIntentsRef.current.set(tempId, {
            title: payload.title,
            url: payload.url,
            price: payload.price ?? null,
        });

        // 2. Update UI Immediately
        setAddItemOpen(false);
        resetAddItemForm();
        setWishlist(prev => prev ? { ...prev, items: [optimisticItem, ...prev.items] } : null);
        setSubmittingItem(true);

        try {
            const res = await axios.post('/api/items', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setWishlist(prev => {
                if (!prev) return null;
                const tempIndex = prev.items.findIndex(i => i.id === tempId);
                if (tempIndex >= 0) {
                    const next = [...prev.items];
                    next[tempIndex] = { ...res.data, localKey: prev.items[tempIndex].localKey || tempId };
                    createIntentsRef.current.delete(tempId);
                    return { ...prev, items: next };
                }

                if (prev.items.some(i => i.id === res.data.id)) {
                    createIntentsRef.current.delete(tempId);
                    return prev;
                }
                return {
                    ...prev,
                    items: [{ ...res.data, localKey: tempId }, ...prev.items]
                };
            });
            toast.success('Item added!');
        } catch {
            setWishlist(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    items: prev.items.filter(i => i.id !== tempId)
                };
            });
            createIntentsRef.current.delete(tempId);
            toast.error('Failed to add item');
        } finally {
            setSubmittingItem(false);
        }
    };

    // Reset the add item form
    const resetAddItemForm = () => {
        setItemTitle('');
        setItemPrice('');
        setItemUrl('');
        setItemImage('');
        setItemStory('');
    };

    // Delete item (owner only)
    // Delete item (Optimistic UI)
    const deleteItem = async (itemId: string) => {
        if (pendingDeleteIds.includes(itemId)) return;

        // 1. Find item to potentially revert
        const itemIndex = wishlist?.items.findIndex(i => i.id === itemId) ?? -1;
        const itemToDelete = itemIndex >= 0 ? wishlist?.items[itemIndex] : undefined;
        setPendingDeleteIds(prev => [...prev, itemId]);

        // 2. Update UI Immediately
        setWishlist(prev => {
            if (!prev) return null;
            return {
                ...prev,
                items: prev.items.filter(i => i.id !== itemId)
            };
        });
        toast.success('Item removed');

        try {
            // 3. Sync with server
            await axios.delete(`/api/items/${itemId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // No need to fetchWishlist, local state is already correct
        } catch {
            // 4. Revert on failure
            if (itemToDelete) {
                setWishlist(prev => {
                    if (!prev) return null;
                    if (prev.items.some(i => i.id === itemToDelete.id)) {
                        return prev;
                    }
                    const nextItems = [...prev.items];
                    const safeIndex = itemIndex >= 0 ? Math.min(itemIndex, nextItems.length) : nextItems.length;
                    nextItems.splice(safeIndex, 0, itemToDelete);
                    return {
                        ...prev,
                        items: nextItems
                    };
                });
                toast.error('Failed to delete item');
            }
        } finally {
            setPendingDeleteIds(prev => prev.filter(id => id !== itemId));
        }
    };

    // Check if guest needs nickname before performing action
    const ensureIdentity = (action: { type: 'reserve' | 'contribute' | 'hype'; itemId: string }) => {
        if (user || guestNickname) {
            if (action.type === 'reserve') reserveItem(action.itemId);
            if (action.type === 'contribute') openContributeDialog(action.itemId);
            if (action.type === 'hype') hypeItem(action.itemId);
        } else {
            setPendingAction(action);
            setNicknameDialogOpen(true);
        }
    };

    // Handle nickname submission
    const handleNicknameSubmit = () => {
        if (!guestNickname.trim()) {
            toast.error('Please enter your name');
            return;
        }
        setNicknameDialogOpen(false);
        if (pendingAction) {
            if (pendingAction.type === 'reserve') reserveItem(pendingAction.itemId);
            if (pendingAction.type === 'contribute') openContributeDialog(pendingAction.itemId);
            if (pendingAction.type === 'hype') hypeItem(pendingAction.itemId);
            setPendingAction(null);
        }
    };

    // Reserve an item
    const reserveItem = async (itemId: string) => {
        if (pendingReserveIds.includes(itemId)) return;

        const reserverIdentifier = user?.email || guestNickname;
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
                nickname: guestNickname || undefined
            }, { headers });
            toast.success('You reserved this gift! Remember to buy it!');
            confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
        } catch (error: any) {
            updateItemInState(itemId, () => previousItem);
            toast.error(getApiErrorMessage(error, 'Failed to reserve'));
        } finally {
            setPendingReserveIds(prev => prev.filter(id => id !== itemId));
        }
    };

    // Unreserve an item (only the person who reserved can undo)
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
                nickname: guestNickname || undefined
            }, { headers });
            toast.success('Reservation cancelled');
        } catch (error: any) {
            updateItemInState(itemId, () => previousItem);
            toast.error(getApiErrorMessage(error, 'Failed to unreserve'));
        } finally {
            setPendingReserveIds(prev => prev.filter(id => id !== itemId));
        }
    };

    // Hype up an item (increment hype count)
    const hypeItem = async (itemId: string) => {
        if (pendingHypeIds.includes(itemId)) return;

        const previousItem = wishlist?.items.find(item => item.id === itemId);
        if (!previousItem) return;

        setPendingHypeIds(prev => [...prev, itemId]);

        try {
            updateItemInState(itemId, item => ({ ...item, hypeCount: item.hypeCount + 1 }));

            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.post(`/api/items/${itemId}/hype`, {
                nickname: guestNickname || undefined
            }, { headers });
        } catch {
            updateItemInState(itemId, () => previousItem);
        } finally {
            setPendingHypeIds(prev => prev.filter(id => id !== itemId));
        }
    };

    // Open contribution dialog
    const openContributeDialog = (itemId: string) => {
        setContributeItemId(itemId);
        setContributeAmount('');
        setContributeMessage('');
        setContributeOpen(true);
    };

    // Submit a contribution
    const submitContribution = async () => {
        const parsedAmount = Number(contributeAmount);

        if (!contributeAmount || parsedAmount <= 0) {
            toast.error('Enter a valid amount');
            return;
        }

        const targetItem = wishlist?.items.find(i => i.id === contributeItemId);
        if (!targetItem) {
            toast.error('Item not found');
            return;
        }

        const previousItem = { ...targetItem };
        const nextCollectedAmount = Number(targetItem.collectedAmount) + parsedAmount;
        const nextIsReserved = targetItem.price ? nextCollectedAmount >= Number(targetItem.price) : targetItem.isReserved;

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
        } catch (error: any) {
            updateItemInState(contributeItemId, () => previousItem);
            toast.error(getApiErrorMessage(error, 'Failed to contribute'));
        } finally {
            setContributeLoading(false);
        }
    };

    // Share wishlist (Native share > Clipboard)
    const copyShareLink = async () => {
        const link = window.location.href;
        const shareData = {
            title: wishlist?.title ? `${wishlist.title} | Giftly` : 'Giftly Wishlist',
            text: `Check out my wishlist on Giftly! ✨`,
            url: link,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                toast.success('Shared successfully!');
                confetti({ particleCount: 30, spread: 40, origin: { y: 0.7 } });
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    navigator.clipboard.writeText(link);
                    toast.success('Link copied to clipboard!');
                }
            }
        } else {
            navigator.clipboard.writeText(link);
            toast.success('Link copied to clipboard!');
        }
    };

    if (loading) return (
        <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading wishlist...
            </div>
        </div>
    );

    if (!wishlist) return (
        <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
            <Gift className="h-16 w-16 text-gray-700" />
            <p className="text-gray-400 text-lg">Wishlist not found</p>
        </div>
    );

    const isOwner = wishlist.isOwner;
    const contributeItem = wishlist.items.find(i => i.id === contributeItemId);
    const reservedCount = wishlist.items.filter(i => i.isReserved).length;
    const totalCollected = wishlist.items.reduce((s, i) => s + Number(i.collectedAmount), 0);
    const themePreset = THEME_PRESETS[wishlist.theme || 'violet-pink'] || THEME_PRESETS['violet-pink'];

    return (
        <div className="min-h-[calc(100vh-3.5rem)] pb-12">
            <div className="relative pt-12 pb-14 px-4 text-center border-b border-border overflow-hidden">
                <div
                    className="absolute inset-0 pointer-events-none opacity-25"
                    style={{
                        background: `radial-gradient(80% 60% at 20% 20%, ${themePreset.from} 0%, transparent 60%), radial-gradient(70% 60% at 80% 80%, ${themePreset.to} 0%, transparent 65%)`,
                    }}
                />

                <div className="relative max-w-4xl mx-auto">
                    <div className="absolute top-0 left-0">
                        <BackButton label="Home" to="/" />
                    </div>
                    <div className="inline-block px-3 py-1 bg-primary/5 border border-primary/10 rounded-full text-[10px] font-bold tracking-widest uppercase text-primary mb-6">
                        Curated Collection
                    </div>
                    <h1 className="text-6xl md:text-8xl font-serif text-foreground tracking-tighter mb-6 italic leading-none">
                        {wishlist.title}
                    </h1>
                    <div className="flex items-center justify-center gap-4 text-muted-foreground">
                        <div className="h-px w-8 bg-border" />
                        <p className="text-sm font-medium tracking-wide">
                            {isOwner ? 'Private Archive' : `By ${wishlist.owner?.name || 'an entity'}`}
                        </p>
                        <div className="h-px w-8 bg-border" />
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 md:px-8">
                <div className="flex flex-wrap items-center justify-center gap-3 -mt-6 relative z-10 mb-8">
                    <Button onClick={copyShareLink} variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm border-border h-9 text-muted-foreground hover:text-foreground active:scale-95 transition-all shadow-sm">
                        <Copy className="h-3.5 w-3.5 mr-1.5" /> Share
                    </Button>

                    {isOwner && (
                        <div className="bg-background/80 backdrop-blur-sm border border-border inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs text-primary shadow-sm font-medium">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                            Spoiler protection active
                        </div>
                    )}

                    {!user && guestNickname && (
                        <div className="bg-background/80 backdrop-blur-sm border border-border inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs text-muted-foreground shadow-sm font-medium">
                            <Users className="h-3.5 w-3.5" />
                            Browsing as <span className="text-foreground">{guestNickname}</span>
                        </div>
                    )}

                    {viewerCount > 0 && (
                        <div className="bg-background/80 backdrop-blur-sm border border-border inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 shadow-sm font-medium">
                            <Eye className="h-3.5 w-3.5 text-emerald-500" />
                            {viewerCount} viewing
                        </div>
                    )}

                    {!isOwner && activityLog.length > 0 && (
                        <button
                            onClick={() => setShowActivity(!showActivity)}
                            className="bg-background/80 backdrop-blur-sm border border-border inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs text-amber-600 dark:text-amber-400 cursor-pointer hover:bg-muted transition-colors shadow-sm font-medium"
                        >
                            <Activity className="h-3.5 w-3.5 text-amber-500" />
                            {activityLog.length} events
                        </button>
                    )}
                </div>

                {!isOwner && wishlist.items.length > 0 && (
                    <div className="flex justify-center gap-6 mb-6 text-sm text-gray-400">
                        <span>{wishlist.items.length} items</span>
                        <span className="text-gray-700">•</span>
                        <span>{reservedCount} reserved</span>
                        <span className="text-gray-700">•</span>
                        <span>${totalCollected.toFixed(0)} collected</span>
                    </div>
                )}

                <AnimatePresence>
                    {showActivity && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mb-6"
                        >
                            <div className="glass rounded-xl p-4 max-h-48 overflow-y-auto space-y-2">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Live Activity</h4>
                                {activityLog.map(event => (
                                    <div key={event.id} className="flex items-center gap-2 text-xs text-gray-400">
                                        <MessageCircle className="h-3 w-3 text-gray-600 shrink-0" />
                                        <span>{event.message}</span>
                                        <span className="ml-auto text-gray-600 shrink-0">
                                            {event.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {isOwner && (
                    <div className="mb-8 text-center">
                        <Dialog open={addItemOpen} onOpenChange={(o) => { setAddItemOpen(o); if (!o) resetAddItemForm(); }}>
                            <DialogTrigger asChild>
                                <Button size="lg" className="shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                                    <Plus className="mr-2" /> Add Item
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-popover border-border">
                                <DialogHeader>
                                    <DialogTitle className="text-foreground">Add Gift Item</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Product URL <span className="text-muted-foreground/50">(optional)</span></Label>
                                        <Input
                                            placeholder="Paste Amazon/any link to auto-fill..."
                                            value={itemUrl}
                                            onChange={(e) => handleUrlPaste(e.target.value)}
                                            className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                                        />
                                        {scraping && (
                                            <div className="text-sm text-muted-foreground flex items-center">
                                                <Loader2 className="h-3 w-3 animate-spin mr-2" /> Auto-filling from URL...
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Item Name *</Label>
                                        <Input
                                            placeholder="AirPods Pro"
                                            value={itemTitle}
                                            onChange={(e) => setItemTitle(e.target.value)}
                                            className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Price ($)</Label>
                                        <Input
                                            placeholder="199"
                                            type="number"
                                            value={itemPrice}
                                            onChange={(e) => setItemPrice(e.target.value)}
                                            className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Image URL (optional)</Label>
                                        <Input
                                            placeholder="https://..."
                                            value={itemImage}
                                            onChange={(e) => setItemImage(e.target.value)}
                                            className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">✨ Why I want it</Label>
                                        <Input
                                            placeholder="Imagine owning this..."
                                            value={itemStory}
                                            onChange={(e) => setItemStory(e.target.value)}
                                            className="bg-background border-input text-foreground placeholder:text-muted-foreground italic text-lg"
                                        />
                                    </div>
                                    {itemImage && (
                                        <div className="rounded-lg overflow-hidden border border-border">
                                            <img src={itemImage} alt="Preview" className="w-full h-32 object-cover" />
                                        </div>
                                    )}
                                    <Button onClick={addItem} disabled={!itemTitle.trim() || submittingItem} className="w-full">
                                        {submittingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add to Wishlist'}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}

                <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>
                    <AnimatePresence>
                        {wishlist.items.map((item) => (
                            <motion.div
                                key={item.localKey || item.id}
                                id={`item-${item.id}`}
                                layout
                                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 26, mass: 0.7 }}
                                className="h-full"
                            >
                                <Card className={`overflow-hidden group relative h-full bg-card border-border shadow-sm hover:shadow-md transition-all ${item.isReserved && !isOwner ? 'opacity-75' : ''}`}>
                                    <div className="aspect-video relative bg-muted/50 overflow-hidden">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-muted">
                                                <Gift size={48} className="text-muted-foreground" />
                                            </div>
                                        )}
                                        {item.price && (
                                            <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold border border-border text-foreground shadow-sm">
                                                ${item.price}
                                            </div>
                                        )}
                                        {item.isReserved && !isOwner && (
                                            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 z-20">
                                                <div className="bg-background text-foreground px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest shadow-md border border-border flex items-center gap-2 mb-2">
                                                    <Lock size={12} /> Reserved
                                                </div>
                                                {item.reservedBy === (user?.email || guestNickname) ? (
                                                    <button
                                                        onClick={() => unreserveItem(item.id)}
                                                        disabled={pendingReserveIds.includes(item.id)}
                                                        className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-60 disabled:no-underline"
                                                    >
                                                        {pendingReserveIds.includes(item.id) ? 'Cancelling...' : 'Cancel my reservation'}
                                                    </button>
                                                ) : (
                                                    <span className="text-muted-foreground text-[10px]">Someone is getting this!</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <h3 className="font-semibold text-lg text-foreground line-clamp-2">
                                                {item.url ? (
                                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors inline-flex items-center gap-1">
                                                        {item.title} <LinkIcon size={12} className="text-muted-foreground shrink-0" />
                                                    </a>
                                                ) : item.title}
                                            </h3>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => ensureIdentity({ type: 'hype', itemId: item.id })}
                                                disabled={pendingHypeIds.includes(item.id)}
                                                className="h-8 px-2 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 gap-1 transition-colors"
                                            >
                                                {pendingHypeIds.includes(item.id)
                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                    : <Flame className={`h-4 w-4 ${item.hypeCount > 0 ? 'fill-current' : ''}`} />}
                                                <span className="text-xs font-bold">{item.hypeCount || 0}</span>
                                            </Button>
                                        </div>
                                        {!isOwner && item.price && !item.isReserved && (
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-xs text-gray-400">
                                                    <span>${Number(item.collectedAmount)} collected</span>
                                                    <span>${Number(item.price)} goal</span>
                                                </div>
                                                <Progress value={(Number(item.collectedAmount) / Number(item.price)) * 100} className="h-2" />
                                            </div>
                                        )}
                                        {item.story && (
                                            <div className="bg-muted/30 p-4 rounded-xl border border-border/40">
                                                <p className="text-sm text-muted-foreground font-serif italic leading-relaxed">
                                                    &ldquo;{item.story}&rdquo;
                                                </p>
                                            </div>
                                        )}
                                        <div className="flex gap-2 pt-1">
                                            {!isOwner && !item.isReserved && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => ensureIdentity({ type: 'reserve', itemId: item.id })}
                                                        disabled={pendingReserveIds.includes(item.id)}
                                                        className="flex-1 bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all"
                                                    >
                                                        {pendingReserveIds.includes(item.id)
                                                            ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                            : <ShieldCheck className="h-3 w-3 mr-1" />}
                                                        {pendingReserveIds.includes(item.id) ? 'Reserving...' : 'Reserve'}
                                                    </Button>
                                                    {item.price && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={contributeLoading && contributeItemId === item.id}
                                                            onClick={() => ensureIdentity({ type: 'contribute', itemId: item.id })}
                                                            className="flex-1 border-border text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                                                        >
                                                            <DollarSign className="h-3 w-3 mr-1" /> Chip In
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                            {isOwner && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={pendingDeleteIds.includes(item.id)}
                                                    onClick={() => deleteItem(item.id)}
                                                    className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 ml-auto transition-all"
                                                >
                                                    {pendingDeleteIds.includes(item.id)
                                                        ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                        : <Trash2 className="h-3 w-3 mr-1" />}
                                                    {pendingDeleteIds.includes(item.id) ? 'Removing...' : 'Remove'}
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>

                {wishlist.items.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Gift className="h-10 w-10 text-gray-600 mb-4" />
                        <h3 className="text-lg font-medium text-gray-400">{isOwner ? 'No items yet' : 'No items in this wishlist yet'}</h3>
                        <p className="text-sm text-gray-600 mt-1">{isOwner ? 'Click "Add Item" to start building your wishlist!' : 'Check back later!'}</p>
                    </div>
                )}
            </div>

            <Dialog open={nicknameDialogOpen} onOpenChange={setNicknameDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>What&apos;s your name?</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">So your friend knows who reserved the gift!</p>
                    <Input placeholder="Enter your name..." value={guestNickname} onChange={(e) => setGuestNickname(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleNicknameSubmit()} autoFocus />
                    <Button onClick={handleNicknameSubmit} className="w-full">Continue</Button>
                </DialogContent>
            </Dialog>

            <Dialog open={contributeOpen} onOpenChange={setContributeOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-amber-500" /> Chip In</DialogTitle></DialogHeader>
                    {contributeItem && (
                        <div className="space-y-4 pt-2">
                            <p className="text-muted-foreground text-sm">Contributing to <span className="text-foreground font-medium">{contributeItem.title}</span></p>
                            {contributeItem.price && (
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>${Number(contributeItem.collectedAmount)} collected</span>
                                        <span>${Number(contributeItem.price) - Number(contributeItem.collectedAmount)} remaining</span>
                                    </div>
                                    <Progress value={(Number(contributeItem.collectedAmount) / Number(contributeItem.price)) * 100} className="h-2" />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Amount ($)</Label>
                                <Input type="number" placeholder="50" value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} autoFocus />
                            </div>
                            <div className="space-y-2">
                                <Label>Message (optional)</Label>
                                <Input placeholder="Happy birthday!" value={contributeMessage} onChange={(e) => setContributeMessage(e.target.value)} />
                            </div>
                            <Button onClick={submitContribution} disabled={contributeLoading} className="w-full">
                                {contributeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Contribute $${contributeAmount || '0'}`}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

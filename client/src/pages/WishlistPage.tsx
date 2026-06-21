import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import AddItemDialog from '@/features/wishlist/components/AddItemDialog';
import ContributionDialog from '@/features/wishlist/components/ContributionDialog';
import DeleteItemConfirmDialog from '@/features/wishlist/components/DeleteItemConfirmDialog';
import GuestNicknameDialog from '@/features/wishlist/components/GuestNicknameDialog';
import WishlistActivityPanel from '@/features/wishlist/components/WishlistActivityPanel';
import WishlistHero from '@/features/wishlist/components/WishlistHero';
import WishlistItemCard from '@/features/wishlist/components/WishlistItemCard';
import WishlistToolbar from '@/features/wishlist/components/WishlistToolbar';
import { THEME_PRESETS, getWishlistCacheKey } from '@/features/wishlist/constants';
import { getApiErrorMessage } from '@/features/wishlist/helpers';
import { useContributions } from '@/features/wishlist/hooks/useContributions';
import { useReservations } from '@/features/wishlist/hooks/useReservations';
import { useSocketUpdates } from '@/features/wishlist/hooks/useSocketUpdates';
import type { ActivityEvent, CreateIntent, Item, PendingAction, Wishlist } from '@/features/wishlist/types';
import { useAuth } from '../context/AuthContext';

export default function WishlistPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, token } = useAuth();

    const [wishlist, setWishlist] = useState<Wishlist | null>(null);
    const [loading, setLoading] = useState(true);

    const [addItemOpen, setAddItemOpen] = useState(false);
    const [itemTitle, setItemTitle] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    const [itemUrl, setItemUrl] = useState('');
    const [itemImage, setItemImage] = useState('');
    const [itemStory, setItemStory] = useState('');
    const [scraping, setScraping] = useState(false);
    const [submittingItem, setSubmittingItem] = useState(false);

    const [guestNickname, setGuestNickname] = useState('');
    const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const [pendingHypeIds, setPendingHypeIds] = useState<string[]>([]);

    const [viewerCount, setViewerCount] = useState(1);
    const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);
    const [showActivity, setShowActivity] = useState(false);

    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        open: boolean;
        itemId: string;
        itemTitle: string;
        contributorCount: number;
    }>({
        open: false,
        itemId: '',
        itemTitle: '',
        contributorCount: 0,
    });

    const isFetching = useRef(false);
    const previewRequestCounter = useRef(0);
    const isOwnerRef = useRef(false);
    const createIntentsRef = useRef<Map<string, CreateIntent>>(new Map());
    const hadCachedWishlistRef = useRef(false);

    const wishlistCacheKey = getWishlistCacheKey(id, user?.id || undefined);

    useEffect(() => {
        isOwnerRef.current = Boolean(wishlist?.isOwner);
    }, [wishlist?.isOwner]);

    const updateItemInState = useCallback((itemId: string, updater: (item: Item) => Item) => {
        setWishlist(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                items: prev.items.map(item => (item.id === itemId ? updater(item) : item)),
            };
        });
    }, []);

    const addActivity = useCallback((type: string, message: string) => {
        setActivityLog(prev => [{
            id: Date.now().toString(),
            type,
            message,
            time: new Date(),
        }, ...prev].slice(0, 20));
    }, []);

    const fetchWishlist = useCallback(async () => {
        if (!id || isFetching.current) return;
        isFetching.current = true;

        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.get(`/api/wishlists/${id}`, { headers });
            setWishlist(res.data);
            sessionStorage.setItem(wishlistCacheKey, JSON.stringify(res.data));
            if (res.data.title) {
                document.title = `${res.data.title} | Giftly`;
            }
        } catch (error: unknown) {
            const status = (error as { response?: { status?: number } }).response?.status;
            if (!hadCachedWishlistRef.current && status !== 404) {
                toast.error('Failed to load wishlist');
            }
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [id, token, wishlistCacheKey]);

    useEffect(() => {
        if (!id) return;

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
    }, [id, fetchWishlist, wishlistCacheKey]);

    useSocketUpdates({
        wishlistId: id,
        setWishlist,
        setViewerCount,
        addActivity,
        isOwnerRef,
        createIntentsRef,
    });

    const {
        pendingReserveIds,
        reserveItem,
        unreserveItem,
    } = useReservations({
        wishlist,
        token,
        userEmail: user?.email,
        guestNickname,
        updateItemInState,
        getApiErrorMessage,
    });

    const {
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
    } = useContributions({
        wishlist,
        token,
        guestNickname,
        updateItemInState,
        getApiErrorMessage,
    });

    const resetAddItemForm = () => {
        setItemTitle('');
        setItemPrice('');
        setItemUrl('');
        setItemImage('');
        setItemStory('');
    };

    const handleUrlPaste = async (value: string) => {
        setItemUrl(value);
        if (!value.startsWith('http')) return;

        const requestId = ++previewRequestCounter.current;
        setScraping(true);

        try {
            const res = await axios.post('/api/items/preview', { url: value }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (requestId !== previewRequestCounter.current) return;

            if (res.data.title) setItemTitle(res.data.title);
            if (res.data.price) setItemPrice(String(res.data.price));
            if (res.data.image) setItemImage(res.data.image);
        } catch {
            // Scraping failures are non-blocking: user can fill manually.
        } finally {
            if (requestId === previewRequestCounter.current) {
                setScraping(false);
            }
        }
    };

    const addItem = async () => {
        if (submittingItem || !id) return;
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
            contributions: [],
        };

        createIntentsRef.current.set(tempId, {
            title: payload.title,
            url: payload.url,
            price: payload.price ?? null,
        });

        setAddItemOpen(false);
        resetAddItemForm();
        setWishlist(prev => (prev ? { ...prev, items: [optimisticItem, ...prev.items] } : null));
        setSubmittingItem(true);

        try {
            const res = await axios.post('/api/items', payload, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setWishlist(prev => {
                if (!prev) return null;

                const tempIndex = prev.items.findIndex(item => item.id === tempId);
                if (tempIndex >= 0) {
                    const next = [...prev.items];
                    next[tempIndex] = { ...res.data, localKey: prev.items[tempIndex].localKey || tempId };
                    createIntentsRef.current.delete(tempId);
                    return { ...prev, items: next };
                }

                if (prev.items.some(item => item.id === res.data.id)) {
                    createIntentsRef.current.delete(tempId);
                    return prev;
                }

                return {
                    ...prev,
                    items: [{ ...res.data, localKey: tempId }, ...prev.items],
                };
            });

            toast.success('Item added!');
        } catch {
            setWishlist(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    items: prev.items.filter(item => item.id !== tempId),
                };
            });
            createIntentsRef.current.delete(tempId);
            toast.error('Failed to add item');
        } finally {
            setSubmittingItem(false);
        }
    };

    const removeItemFromState = (itemId: string) => {
        setWishlist(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                items: prev.items.filter(item => item.id !== itemId),
            };
        });
    };

    const deleteItem = async (itemId: string, force = false) => {
        if (pendingDeleteIds.includes(itemId)) return;

        const item = wishlist?.items.find(entry => entry.id === itemId);
        if (!item) return;

        setPendingDeleteIds(prev => [...prev, itemId]);

        try {
            await axios.delete(`/api/items/${itemId}${force ? '?force=true' : ''}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            removeItemFromState(itemId);
            setDeleteConfirmation(prev => ({ ...prev, open: false }));
            toast.success('Item removed');
        } catch (error: unknown) {
            const payload = error as {
                response?: { data?: { code?: string; details?: { contributorCount?: number } } };
            };
            const responseCode = payload.response?.data?.code;
            if (responseCode === 'ITEM_DELETE_CONFIRMATION_REQUIRED') {
                const contributorCount = Number(payload.response?.data?.details?.contributorCount || 0);
                setDeleteConfirmation({
                    open: true,
                    itemId,
                    itemTitle: item.title,
                    contributorCount,
                });
                return;
            }

            toast.error(getApiErrorMessage(error, 'Failed to delete item'));
        } finally {
            setPendingDeleteIds(prev => prev.filter(idValue => idValue !== itemId));
        }
    };

    const hypeItem = async (itemId: string) => {
        if (pendingHypeIds.includes(itemId)) return;

        const previousItem = wishlist?.items.find(item => item.id === itemId);
        if (!previousItem) return;

        setPendingHypeIds(prev => [...prev, itemId]);

        try {
            updateItemInState(itemId, item => ({ ...item, hypeCount: item.hypeCount + 1 }));

            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.post(`/api/items/${itemId}/hype`, {
                nickname: guestNickname || undefined,
            }, { headers });
        } catch {
            updateItemInState(itemId, () => previousItem);
        } finally {
            setPendingHypeIds(prev => prev.filter(idValue => idValue !== itemId));
        }
    };

    const ensureIdentity = (action: PendingAction) => {
        if (user || guestNickname) {
            if (action.type === 'reserve') reserveItem(action.itemId);
            if (action.type === 'contribute') openContributeDialog(action.itemId);
            if (action.type === 'hype') hypeItem(action.itemId);
            return;
        }

        setPendingAction(action);
        setNicknameDialogOpen(true);
    };

    const handleNicknameSubmit = () => {
        if (!guestNickname.trim()) {
            toast.error('Please enter your name');
            return;
        }

        setNicknameDialogOpen(false);

        if (!pendingAction) return;
        if (pendingAction.type === 'reserve') reserveItem(pendingAction.itemId);
        if (pendingAction.type === 'contribute') openContributeDialog(pendingAction.itemId);
        if (pendingAction.type === 'hype') hypeItem(pendingAction.itemId);
        setPendingAction(null);
    };

    const copyShareLink = async () => {
        const link = window.location.href;
        const shareData = {
            title: wishlist?.title ? `${wishlist.title} | Giftly` : 'Giftly Wishlist',
            text: 'Check out my wishlist on Giftly! ✨',
            url: link,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                toast.success('Shared successfully!');
                confetti({ particleCount: 30, spread: 40, origin: { y: 0.7 } });
                return;
            } catch (error) {
                if ((error as Error).name === 'AbortError') {
                    return;
                }
            }
        }

        navigator.clipboard.writeText(link);
        toast.success('Link copied to clipboard!');
    };

    const reservedCount = useMemo(
        () => wishlist?.items.filter(item => item.isReserved).length ?? 0,
        [wishlist?.items]
    );

    const totalCollected = useMemo(
        () => wishlist?.items.reduce((sum, item) => sum + Number(item.collectedAmount), 0) ?? 0,
        [wishlist?.items]
    );

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading wishlist...
                </div>
            </div>
        );
    }

    if (!wishlist) {
        return (
            <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
                <div className="max-w-md w-full rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-8 text-center shadow-lg">
                    <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                        <Gift className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">Wishlist not found</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        The link may be outdated, or the list is still being created. Try again in a few seconds.
                    </p>
                    <div className="mt-5 flex gap-2 justify-center">
                        <Button variant="outline" onClick={() => window.location.reload()}>
                            Retry
                        </Button>
                        <Button onClick={() => navigate('/')}>
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const isOwner = wishlist.isOwner;
    const themePreset = THEME_PRESETS[wishlist.theme || 'violet-pink'] || THEME_PRESETS['violet-pink'];
    const currentIdentifier = user?.email || guestNickname;

    return (
        <div className="min-h-[calc(100vh-3.5rem)] pb-12">
            <WishlistHero
                title={wishlist.title}
                ownerName={wishlist.owner?.name}
                isOwner={isOwner}
                theme={themePreset}
            />

            <div className="max-w-5xl mx-auto px-4 md:px-8">
                <WishlistToolbar
                    isOwner={isOwner}
                    hasUser={Boolean(user)}
                    guestNickname={guestNickname}
                    viewerCount={viewerCount}
                    activityCount={activityLog.length}
                    showActivity={showActivity}
                    onToggleActivity={() => setShowActivity(prev => !prev)}
                    onShare={copyShareLink}
                />

                {!isOwner && wishlist.items.length > 0 && (
                    <div className="flex justify-center gap-6 mb-6 text-sm text-gray-400">
                        <span>{wishlist.items.length} items</span>
                        <span className="text-gray-700">•</span>
                        <span>{reservedCount} reserved</span>
                        <span className="text-gray-700">•</span>
                        <span>${totalCollected.toFixed(0)} collected</span>
                    </div>
                )}

                <WishlistActivityPanel events={activityLog} show={showActivity} />

                {isOwner && (
                    <AddItemDialog
                        open={addItemOpen}
                        setOpen={setAddItemOpen}
                        itemTitle={itemTitle}
                        setItemTitle={setItemTitle}
                        itemPrice={itemPrice}
                        setItemPrice={setItemPrice}
                        itemUrl={itemUrl}
                        itemImage={itemImage}
                        setItemImage={setItemImage}
                        itemStory={itemStory}
                        setItemStory={setItemStory}
                        scraping={scraping}
                        submittingItem={submittingItem}
                        onAddItem={addItem}
                        onUrlPaste={handleUrlPaste}
                        onReset={resetAddItemForm}
                    />
                )}

                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.18 }}
                >
                    <AnimatePresence>
                        {wishlist.items.map(item => (
                            <WishlistItemCard
                                key={item.localKey || item.id}
                                item={item}
                                isOwner={isOwner}
                                currentIdentifier={currentIdentifier}
                                pendingReserve={pendingReserveIds.includes(item.id)}
                                pendingHype={pendingHypeIds.includes(item.id)}
                                pendingDelete={pendingDeleteIds.includes(item.id)}
                                contributeLoading={contributeLoading}
                                contributeItemId={contributeItemId}
                                onReserveRequest={(itemId) => ensureIdentity({ type: 'reserve', itemId })}
                                onContributeRequest={(itemId) => ensureIdentity({ type: 'contribute', itemId })}
                                onDelete={(itemId) => deleteItem(itemId)}
                                onUnreserve={unreserveItem}
                                onHypeRequest={(itemId) => ensureIdentity({ type: 'hype', itemId })}
                            />
                        ))}
                    </AnimatePresence>
                </motion.div>

                {wishlist.items.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Gift className="h-10 w-10 text-gray-600 mb-4" />
                        <h3 className="text-lg font-medium text-gray-400">
                            {isOwner ? 'No items yet' : 'No items in this wishlist yet'}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                            {isOwner ? 'Click "Add Item" to start building your wishlist!' : 'Check back later!'}
                        </p>
                    </div>
                )}
            </div>

            <GuestNicknameDialog
                open={nicknameDialogOpen}
                setOpen={setNicknameDialogOpen}
                guestNickname={guestNickname}
                setGuestNickname={setGuestNickname}
                onSubmit={handleNicknameSubmit}
            />

            <ContributionDialog
                open={contributeOpen}
                setOpen={setContributeOpen}
                item={contributeItem}
                amount={contributeAmount}
                setAmount={setContributeAmount}
                message={contributeMessage}
                setMessage={setContributeMessage}
                loading={contributeLoading}
                onSubmit={submitContribution}
            />

            <DeleteItemConfirmDialog
                open={deleteConfirmation.open}
                setOpen={(open) => setDeleteConfirmation(prev => ({ ...prev, open }))}
                itemTitle={deleteConfirmation.itemTitle}
                contributorCount={deleteConfirmation.contributorCount}
                loading={pendingDeleteIds.includes(deleteConfirmation.itemId)}
                onConfirm={() => deleteItem(deleteConfirmation.itemId, true)}
            />
        </div>
    );
}

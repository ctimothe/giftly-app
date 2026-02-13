// ProfilePage - User's personal hub with Shrine (Top 4), Haul Log, and Gift Wrapped stats
// Premium Coquette aesthetic with glassmorphic cards and Lucide icons throughout

import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
    Crown, BookOpen, Sparkles, Loader2,
    Plus, X, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ShrineGrid from '@/components/features/ShrineGrid';
import HaulCard from '@/components/features/HaulCard';
import WrappedCard from '@/components/features/WrappedCard';
import BackButton from '@/components/ui/BackButton';

const getProfileCacheKey = (userId?: string) => `giftly:profile:${userId || 'guest'}`;

/** Shape of a wishlist item for shrine selection */
interface WishlistItem {
    id: string;
    title: string;
    imageUrl?: string | null;
    price?: number | null;
    hypeCount: number;
    story?: string | null;
}

/** Shape of a haul entry from the API */
interface HaulEntry {
    id: string;
    rating: number;
    review?: string | null;
    photoUrl?: string | null;
    createdAt: string;
    item: {
        title: string;
        imageUrl?: string | null;
        price?: number | null;
        hypeCount: number;
    };
}

/**
 * ProfilePage - Renders the authenticated user's profile with:
 * 1. Shrine (Top 4 pinned items) - editable
 * 2. Gift Wrapped (analytics card)
 * 3. Haul Log (diary of fulfilled items)
 */
export default function ProfilePage() {
    const { user, token } = useAuth();
    const [shrineItems, setShrineItems] = useState<WishlistItem[]>([]);
    const [hauls, setHauls] = useState<HaulEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Shrine editing state
    const [editingShrine, setEditingShrine] = useState(false);
    const [allItems, setAllItems] = useState<WishlistItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [savingShrine, setSavingShrine] = useState(false);
    const [loadingShrineItems, setLoadingShrineItems] = useState(false);
    const profileCacheKey = getProfileCacheKey(user?.id);

    // Fetch shrine + hauls on mount
    useEffect(() => {
        if (!user) return;
        document.title = `${user.name} | Giftly`;

        const cached = sessionStorage.getItem(profileCacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached) as { shrine: WishlistItem[]; hauls: HaulEntry[] };
                if (parsed && Array.isArray(parsed.shrine) && Array.isArray(parsed.hauls)) {
                    setShrineItems(parsed.shrine);
                    setHauls(parsed.hauls);
                    setLoading(false);
                }
            } catch {
                sessionStorage.removeItem(profileCacheKey);
            }
        }

        const fetchProfile = async () => {
            try {
                const [shrineRes, haulsRes] = await Promise.all([
                    axios.get(`/api/shrine/${user.id}`),
                    axios.get(`/api/hauls/${user.id}`),
                ]);
                setShrineItems(shrineRes.data.shrine);
                setHauls(haulsRes.data);
                sessionStorage.setItem(profileCacheKey, JSON.stringify({ shrine: shrineRes.data.shrine, hauls: haulsRes.data }));
            } catch {
                // Silently handle - sections just won't appear
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user, profileCacheKey]);

    const getApiErrorMessage = (error: any, fallback: string) => {
        return error?.response?.data?.error?.message
            || error?.response?.data?.error
            || fallback;
    };

    /**
     * Fetch all owned items for shrine editing (from all wishlists).
     * Called when entering edit mode.
     */
    const startEditingShrine = async () => {
        if (loadingShrineItems) return;
        setLoadingShrineItems(true);
        try {
            const res = await axios.get('/api/wishlists', {
                headers: { Authorization: `Bearer ${token}` },
            });
            // Flatten all items from all wishlists
            const items: WishlistItem[] = res.data.flatMap(
                (wl: { items: WishlistItem[] }) => wl.items
            );
            setAllItems(items);
            setSelectedIds(shrineItems.map(i => i.id));
            setEditingShrine(true);
        } catch (error: any) {
            toast.error(getApiErrorMessage(error, 'Failed to load your items'));
        } finally {
            setLoadingShrineItems(false);
        }
    };

    /** Toggle item selection for shrine (max 4) */
    const toggleShrineItem = (itemId: string) => {
        setSelectedIds(prev => {
            if (prev.includes(itemId)) {
                return prev.filter(id => id !== itemId);
            }
            if (prev.length >= 4) {
                toast.error('Maximum 4 items in your shrine');
                return prev;
            }
            return [...prev, itemId];
        });
    };

    /** Save the shrine selection to the backend */
    const saveShrine = async () => {
        if (savingShrine) return;

        const previousShrineItems = shrineItems;
        const selectedSet = new Set(selectedIds);
        const optimisticShrine = allItems
            .filter(item => selectedSet.has(item.id))
            .sort((a, b) => selectedIds.indexOf(a.id) - selectedIds.indexOf(b.id));

        setSavingShrine(true);
        setShrineItems(optimisticShrine);
        try {
            await axios.put('/api/shrine', { itemIds: selectedIds }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEditingShrine(false);
            toast.success('Shrine updated');
        } catch (error: any) {
            setShrineItems(previousShrineItems);
            toast.error(getApiErrorMessage(error, 'Failed to save shrine'));
        } finally {
            setSavingShrine(false);
        }
    };

    // Active section tab
    const [activeTab, setActiveTab] = useState<'shrine' | 'wrapped' | 'hauls'>('shrine');

    // Available tabs for navigation
    const tabs = useMemo(() => [
        { key: 'shrine' as const, label: 'Holy Grail', icon: Crown },
        { key: 'wrapped' as const, label: 'Gift Wrapped', icon: Sparkles },
        { key: 'hauls' as const, label: 'Haul Log', icon: BookOpen },
    ], []);

    // Loading state
    if (loading) return (
        <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading profile...
            </div>
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            {/* Profile header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative mb-12 text-center"
            >
                <div className="absolute top-0 left-0">
                    <BackButton to="/" label="Dashboard" />
                </div>

                {/* Profile Header Block */}
                <div className="pt-6">
                    <div className="h-24 w-24 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-6 shadow-xl border border-border/50">
                        <span className="text-3xl font-serif font-bold text-foreground">
                            {user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif italic text-foreground tracking-tight">
                        {user?.name || 'Your Profile'}
                    </h1>
                    <p className="text-muted-foreground mt-3 text-sm flex items-center justify-center gap-2">
                        <Sparkles className="h-3.5 w-3.5" /> Curator of Fine Things
                    </p>
                </div>
            </motion.div>

            {/* Tab navigation */}
            <div className="flex gap-1 p-1 rounded-xl bg-muted/30 border border-border mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${activeTab === tab.key
                            ? 'bg-primary/10 text-primary border border-primary/10'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <tab.icon className="h-3.5 w-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
            >
                {/* SHRINE TAB */}
                {activeTab === 'shrine' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Crown className="h-5 w-5 text-amber-400" />
                                <h2 className="text-2xl font-serif italic text-foreground">
                                    Holy Grail
                                </h2>
                            </div>
                            {!editingShrine ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={startEditingShrine}
                                    disabled={loadingShrineItems}
                                    className="text-xs text-gray-400 hover:text-white"
                                >
                                    {loadingShrineItems
                                        ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Loading...</>
                                        : <><Plus className="h-3 w-3 mr-1" /> Edit</>}
                                </Button>
                            ) : (
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingShrine(false)}
                                        disabled={savingShrine}
                                        className="text-xs text-gray-400"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={saveShrine}
                                        disabled={savingShrine}
                                        className="text-xs bg-violet-600 hover:bg-violet-500"
                                    >
                                        {savingShrine ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <><Check className="h-3 w-3 mr-1" /> Save</>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Shrine edit mode - item picker */}
                        {editingShrine ? (
                            <div className="space-y-2">
                                <p className="text-xs text-gray-500 mb-3">
                                    Select up to 4 items for your Holy Grail ({selectedIds.length}/4)
                                </p>
                                <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
                                    {allItems.map(item => {
                                        const isSelected = selectedIds.includes(item.id);
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => toggleShrineItem(item.id)}
                                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${isSelected
                                                    ? 'border-amber-400 ring-2 ring-amber-400/30'
                                                    : 'border-white/5 hover:border-white/20'
                                                    }`}
                                            >
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                                        <span className="text-[10px] text-gray-600 text-center px-1 truncate">{item.title}</span>
                                                    </div>
                                                )}
                                                {isSelected && (
                                                    <div className="absolute inset-0 bg-amber-400/20 flex items-center justify-center">
                                                        <Check className="h-6 w-6 text-amber-400" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <>
                                {shrineItems.length > 0 ? (
                                    <ShrineGrid items={shrineItems} userName={user?.name} />
                                ) : (
                                    <div className="text-center py-12 bg-card rounded-xl border border-border shadow-sm">
                                        <Crown className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                                        <p className="text-sm text-muted-foreground">Your shrine is empty</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            Pin your top 4 must-haves
                                        </p>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={startEditingShrine}
                                            disabled={loadingShrineItems}
                                            className="mt-3 text-xs text-violet-400"
                                        >
                                            {loadingShrineItems
                                                ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Loading...</>
                                                : <><Plus className="h-3 w-3 mr-1" /> Choose Items</>}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* WRAPPED TAB */}
                {activeTab === 'wrapped' && user && (
                    <WrappedCard userId={user.id} />
                )}

                {/* HAUL LOG TAB */}
                {activeTab === 'hauls' && (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="h-5 w-5 text-emerald-400" />
                            <h2 className="text-2xl font-serif italic text-foreground">
                                Haul Log
                            </h2>
                        </div>
                        {hauls.length > 0 ? (
                            <div className="space-y-3">
                                {hauls.map(haul => (
                                    <HaulCard key={haul.id} haul={haul} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-card rounded-xl border border-border shadow-sm">
                                <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-gray-500">No hauls yet</p>
                                <p className="text-xs text-gray-600 mt-1">
                                    Fulfill items and log your experience
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
}

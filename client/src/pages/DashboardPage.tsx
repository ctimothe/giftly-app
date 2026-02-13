// DashboardPage — Premium gallery dashboard with gradient cover cards

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Gift, Trash2, Copy, ExternalLink, Sparkles, Package, BarChart3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// --- Gradient theme presets for wishlist covers ---
const THEME_PRESETS: Record<string, { from: string; to: string; label: string }> = {
    'violet-pink': { from: '#7c3aed', to: '#ec4899', label: 'Violet Pink' },
    'blue-cyan': { from: '#2563eb', to: '#06b6d4', label: 'Ocean Blue' },
    'amber-orange': { from: '#f59e0b', to: '#ef4444', label: 'Sunset' },
    'green-teal': { from: '#10b981', to: '#14b8a6', label: 'Emerald' },
    'rose-red': { from: '#f43f5e', to: '#e11d48', label: 'Rose Red' },
    'slate-indigo': { from: '#6366f1', to: '#4338ca', label: 'Indigo' },
};

/**
 * getGradientStyle — Returns inline CSS gradient from a theme key.
 */
const getGradientStyle = (theme: string) => {
    const preset = THEME_PRESETS[theme] || THEME_PRESETS['violet-pink'];
    return { background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` };
};

const DASHBOARD_CACHE_KEY = 'giftly:dashboard:wishlists';

// Wishlist shape from API
interface Wishlist {
    id: string;
    title: string;
    theme?: string;
    _count: { items: number };
    createdAt: string;
    localKey?: string;
}

export default function DashboardPage() {
    const { user, token } = useAuth();
    const [wishlists, setWishlists] = useState<Wishlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTitle, setNewTitle] = useState('');
    const [selectedTheme, setSelectedTheme] = useState('violet-pink');
    const [open, setOpen] = useState(false);
    const [creatingWishlist, setCreatingWishlist] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const hasFetchedOnceRef = useRef(false);
    const isFetchingRef = useRef(false);
    const lastPayloadSignatureRef = useRef('');

    // Fetch user's wishlists on mount
    useEffect(() => {
        document.title = 'Dashboard | Giftly';

        const cached = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached) as Wishlist[];
                if (Array.isArray(parsed) && parsed.length >= 0) {
                    setWishlists(parsed);
                    setLoading(false);
                }
            } catch {
                sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
            }
        }

        if (hasFetchedOnceRef.current) return;
        hasFetchedOnceRef.current = true;
        fetchWishlists();
    }, []);

    const fetchWishlists = async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            const res = await axios.get('/api/wishlists', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const mappedWishlists = res.data.map((wishlist: Wishlist) => ({
                ...wishlist,
                localKey: wishlist.localKey || wishlist.id,
            }));

            const signature = JSON.stringify(
                mappedWishlists.map((wishlist: Wishlist) => ({
                    id: wishlist.id,
                    title: wishlist.title,
                    theme: wishlist.theme,
                    items: wishlist._count?.items || 0,
                    createdAt: wishlist.createdAt,
                }))
            );

            if (signature !== lastPayloadSignatureRef.current) {
                lastPayloadSignatureRef.current = signature;
                setWishlists(mappedWishlists);
                sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(mappedWishlists));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    };

    const getApiErrorMessage = (error: any, fallback: string) => {
        return error?.response?.data?.error?.message
            || error?.response?.data?.error
            || fallback;
    };

    // Create a new wishlist with selected theme
    const createWishlist = async () => {
        if (!newTitle.trim() || creatingWishlist) return;

        const tempId = `temp-${Date.now()}`;
        const title = newTitle.trim();
        const theme = selectedTheme;
        const optimisticWishlist: Wishlist = {
            id: tempId,
            title,
            theme,
            _count: { items: 0 },
            createdAt: new Date().toISOString(),
            localKey: tempId,
        };

        setCreatingWishlist(true);
        setWishlists(prev => [optimisticWishlist, ...prev]);
        setOpen(false);
        setNewTitle('');
        setSelectedTheme('violet-pink');

        try {
            const res = await axios.post('/api/wishlists', { title, theme }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setWishlists(prev => {
                const createdWishlist: Wishlist = {
                    ...res.data,
                    _count: { items: 0 },
                    localKey: tempId,
                };
                const tempIndex = prev.findIndex(wishlist => wishlist.id === tempId);
                if (tempIndex >= 0) {
                    const next = [...prev];
                    next[tempIndex] = createdWishlist;
                    return next;
                }
                if (prev.some(wishlist => wishlist.id === createdWishlist.id)) {
                    return prev;
                }
                return [createdWishlist, ...prev];
            });

            toast.success('Wishlist created!');
        } catch (error: any) {
            setWishlists(prev => prev.filter(wishlist => wishlist.id !== tempId));
            toast.error(getApiErrorMessage(error, 'Failed to create wishlist'));
        } finally {
            setCreatingWishlist(false);
        }
    };

    // Delete a wishlist with confirmation
    const deleteWishlist = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (pendingDeleteIds.includes(id)) return;
        if (!confirm('Delete this wishlist and all its items?')) return;

        const previousWishlists = wishlists;
        setPendingDeleteIds(prev => [...prev, id]);
        setWishlists(prev => prev.filter(wishlist => wishlist.id !== id));

        try {
            await axios.delete(`/api/wishlists/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Wishlist deleted');
        } catch (error: any) {
            setWishlists(previousWishlists);
            toast.error(getApiErrorMessage(error, 'Failed to delete wishlist'));
        } finally {
            setPendingDeleteIds(prev => prev.filter(itemId => itemId !== id));
        }
    };

    // Copy shareable link to clipboard
    const copyShareLink = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const link = `${window.location.origin}/wishlist/${id}`;
        navigator.clipboard.writeText(link);
        toast.success('Share link copied!');
    };

    // Calculate stats from wishlists
    const totalItems = wishlists.reduce((sum, wl) => sum + (wl._count?.items || 0), 0);

    // Format relative time from createdAt
    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 30) return `${days}d ago`;
        return `${Math.floor(days / 30)}mo ago`;
    };

    // Loading state
    if (loading) return (
        <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading dashboard...
            </div>
        </div>
    );
    return (
        <div className="min-h-[calc(100vh-3.5rem)] relative overflow-hidden">

            <div className="relative p-4 md:p-8 max-w-6xl mx-auto">
                {/* Header with greeting and new wishlist CTA */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h1 className="text-5xl md:text-6xl font-serif text-foreground tracking-tighter italic">
                            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0] || 'friend'}
                        </h1>
                        <p className="text-muted-foreground mt-3 text-sm tracking-wide uppercase font-semibold opacity-60">
                            Your Curated Selection • {wishlists.length} Wishlists
                        </p>
                    </motion.div>

                    {/* Create Wishlist Dialog */}
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button size="lg" className="shadow-lg shadow-primary/20 active:scale-95 transition-all">
                                <Plus className="mr-2 h-4 w-4" /> New Wishlist
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-popover border-border">
                            <DialogHeader>
                                <DialogTitle className="text-foreground flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary" /> Create New Wishlist
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-5 pt-2">
                                {/* Title input */}
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Title</Label>
                                    <Input
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        placeholder="Birthday Wishlist 2026"
                                        onKeyDown={(e) => e.key === 'Enter' && createWishlist()}
                                        className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:ring-ring"
                                        autoFocus
                                    />
                                </div>

                                {/* Gradient theme picker */}
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Choose a vibe</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                                            <button
                                                key={key}
                                                onClick={() => setSelectedTheme(key)}
                                                className={`relative h-16 rounded-xl transition-all cursor-pointer ${selectedTheme === key
                                                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
                                                    : 'hover:scale-105 opacity-70 hover:opacity-100'
                                                    }`}
                                                style={getGradientStyle(key)}
                                                title={preset.label}
                                            >
                                                {/* Label overlay */}
                                                <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-medium text-white/80">
                                                    {preset.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="rounded-xl overflow-hidden h-24 relative" style={getGradientStyle(selectedTheme)}>
                                    <div className="absolute inset-0 bg-black/20 flex items-end p-3">
                                        <span className="text-white font-bold text-lg drop-shadow-lg">
                                            {newTitle || 'Your Wishlist'}
                                        </span>
                                    </div>
                                </div>

                                <Button onClick={createWishlist} disabled={!newTitle.trim() || creatingWishlist} className="w-full active:scale-95 transition-transform">
                                    {creatingWishlist ? <span className="inline-flex items-center gap-2"><span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Creating...</span> : 'Create Wishlist'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats strip — only show when there are wishlists */}
                {wishlists.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                        {[
                            { icon: Gift, label: 'Wishlists', value: wishlists.length, color: 'text-violet-400' },
                            { icon: Package, label: 'Total Items', value: totalItems, color: 'text-pink-400' },
                            { icon: BarChart3, label: 'Avg per List', value: wishlists.length > 0 ? Math.round(totalItems / wishlists.length) : 0, color: 'text-cyan-400' },
                        ].map((stat) => (
                            <div key={stat.label} className="bg-card border border-border shadow-sm rounded-xl p-4 flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                                    <stat.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Wishlist gallery grid */}
                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {wishlists.map((wishlist) => (
                            <motion.div
                                key={wishlist.localKey || wishlist.id}
                                whileHover={{ y: -4 }}
                                transition={{ duration: 0.16 }}
                                className="group relative bg-card border border-border shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden"
                            >
                                <Link to={`/wishlist/${wishlist.id}`} className="group block">
                                    <div className="rounded-xl overflow-hidden bg-card border border-border/50">
                                        {/* Gradient cover area */}
                                        <div
                                            className="h-40 relative overflow-hidden"
                                            style={getGradientStyle(wishlist.theme || 'violet-pink')}
                                        >
                                            {/* Decorative pattern overlay */}
                                            <div className="absolute inset-0 opacity-20"
                                                style={{
                                                    backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)'
                                                }}
                                            />
                                            {/* Centered gift icon */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Gift className="h-16 w-16 text-white/20 group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                            {/* Bottom blur overlay with title */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12">
                                                <h3 className="text-white font-bold text-lg drop-shadow-lg line-clamp-1">{wishlist.title}</h3>
                                            </div>
                                            {/* Item count badge */}
                                            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/30 backdrop-blur-sm text-xs font-medium text-white">
                                                {wishlist._count?.items || 0} items
                                            </div>
                                        </div>

                                        {/* Card footer with actions */}
                                        <div className="px-4 py-3 flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">{timeAgo(wishlist.createdAt)}</span>
                                            <div className="flex gap-1">
                                                {/* Copy share link */}
                                                <button
                                                    onClick={(e) => copyShareLink(wishlist.id, e)}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                                                    title="Copy share link"
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </button>
                                                {/* Open preview */}
                                                <button
                                                    onClick={(e) => { e.preventDefault(); window.open(`/wishlist/${wishlist.id}`, '_blank'); }}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                                                    title="Open preview"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </button>
                                                {/* Delete */}
                                                <button
                                                    onClick={(e) => deleteWishlist(wishlist.id, e)}
                                                    disabled={pendingDeleteIds.includes(wishlist.id)}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                                    title="Delete wishlist"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Empty state — premium illustration with CTA */}
                {!loading && wishlists.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="mb-6">
                            <div className="h-24 w-24 rounded-2xl bg-muted/50 flex items-center justify-center border border-border/50">
                                <Gift className="h-12 w-12 text-muted-foreground/30" />
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">No wishlists yet</h3>
                        <p className="text-gray-500 max-w-sm mb-6">
                            Create your first wishlist, add gifts, and share the link with friends!
                        </p>
                        <Button
                            onClick={() => setOpen(true)}
                            size="lg"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Create First Wishlist
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

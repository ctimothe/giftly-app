// WrappedCard - "Gift Wrapped" shareable stats card (Spotify Wrapped-inspired)
// Generates a visually rich card with user's wishlist analytics

import { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    TrendingUp, Flame, DollarSign, Target,
    Users, BarChart3, Sparkles, Loader2
} from 'lucide-react';

/** Shape of the wrapped stats from the API */
interface WrappedStats {
    userName: string;
    karma: number;
    level: number;
    stats: {
        totalItems: number;
        totalWishlists: number;
        totalValue: number;
        fulfilledCount: number;
        fulfillmentRate: number;
        mostExpensive: { title: string; price: number } | null;
        mostHyped: { title: string; hypeCount: number } | null;
        topContributor: { name: string; total: number } | null;
    };
    imageUrls: string[];
}

interface WrappedCardProps {
    userId: string;
}

/**
 * WrappedCard - Fetches and renders Spotify-Wrapped-style analytics.
 * Shows most expensive item, most hyped, top contributor, and fulfillment rate.
 */
export default function WrappedCard({ userId }: WrappedCardProps) {
    const [data, setData] = useState<WrappedStats | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch wrapped stats on mount
    useEffect(() => {
        const fetchWrapped = async () => {
            try {
                const res = await axios.get(`/api/wrapped/${userId}`);
                setData(res.data);
            } catch {
                // Silently fail - card just won't render
            } finally {
                setLoading(false);
            }
        };
        fetchWrapped();
    }, [userId]);

    if (loading) {
        return (
            <div className="glass rounded-2xl p-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            </div>
        );
    }

    if (!data || data.stats.totalItems === 0) return null;

    // Stat row component for reuse
    const StatRow = ({ icon: Icon, label, value, accent = 'text-violet-400' }: {
        icon: React.ElementType;
        label: string;
        value: string;
        accent?: string;
    }) => (
        <div className="flex items-center gap-3 py-2">
            <div className={`h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center ${accent}`}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-white truncate">{value}</p>
            </div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl border border-white/5 overflow-hidden"
        >
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-violet-600/30 to-pink-600/20 px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-violet-400" />
                    <h2 className="text-base font-bold text-white font-coquette italic">
                        {data.userName}'s Gift Wrapped
                    </h2>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Your wishlist personality, decoded.</p>
            </div>

            {/* Stats grid */}
            <div className="px-5 py-3 space-y-0.5">
                {/* Overview */}
                <StatRow
                    icon={BarChart3}
                    label="Total Wishlist Value"
                    value={`$${data.stats.totalValue.toLocaleString()}`}
                    accent="text-emerald-400"
                />

                <StatRow
                    icon={Target}
                    label="Fulfillment Rate"
                    value={`${data.stats.fulfillmentRate}% (${data.stats.fulfilledCount}/${data.stats.totalItems})`}
                    accent="text-amber-400"
                />

                {/* Most Delusional Wish */}
                {data.stats.mostExpensive && (
                    <StatRow
                        icon={DollarSign}
                        label="Most Delusional Wish"
                        value={`${data.stats.mostExpensive.title} ($${data.stats.mostExpensive.price})`}
                        accent="text-rose-400"
                    />
                )}

                {/* Most Hyped */}
                {data.stats.mostHyped && data.stats.mostHyped.hypeCount > 0 && (
                    <StatRow
                        icon={Flame}
                        label="Most Hyped"
                        value={`${data.stats.mostHyped.title} (${data.stats.mostHyped.hypeCount} hypes)`}
                        accent="text-orange-400"
                    />
                )}

                {/* Top Contributor */}
                {data.stats.topContributor && (
                    <StatRow
                        icon={Users}
                        label="Top Contributor"
                        value={`${data.stats.topContributor.name} ($${data.stats.topContributor.total})`}
                        accent="text-cyan-400"
                    />
                )}

                {/* Level & Karma */}
                <StatRow
                    icon={TrendingUp}
                    label="Level & Karma"
                    value={`Level ${data.level} / ${data.karma} karma`}
                    accent="text-violet-400"
                />
            </div>

            {/* Footer watermark */}
            <div className="px-5 py-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-gray-600 font-coquette italic">giftly wrapped</span>
                <span className="text-[10px] text-gray-600">{data.stats.totalWishlists} wishlists / {data.stats.totalItems} items</span>
            </div>
        </motion.div>
    );
}

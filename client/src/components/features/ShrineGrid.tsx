// ShrineGrid - "Top 4 Holy Grail" items grid for user profile identity signal
// Renders a 2x2 grid of pinned items with a premium glassmorphic card style

import { motion } from 'framer-motion';
import { Crown, ImageOff } from 'lucide-react';

/** Shape of a single shrine item from the API */
interface ShrineItem {
    id: string;
    title: string;
    imageUrl?: string | null;
    price?: number | null;
    hypeCount: number;
}

interface ShrineGridProps {
    items: ShrineItem[];
    userName?: string;
}

/**
 * ShrineGrid - Renders the user's "Holy Grail" Top 4 items in a premium 2x2 grid.
 * Uses Lucide Crown icon and glassmorphic styling. No raw emojis.
 */
export default function ShrineGrid({ items, userName }: ShrineGridProps) {
    if (items.length === 0) return null;

    return (
        <div className="mb-8">
            {/* Section header with Crown icon */}
            <div className="flex items-center gap-2 mb-4">
                <Crown className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white font-coquette italic">
                    {userName ? `${userName}'s` : 'My'} Holy Grail
                </h2>
            </div>

            {/* 2x2 grid of shrine items */}
            <div className="grid grid-cols-2 gap-3">
                {items.slice(0, 4).map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                        className="group relative aspect-square rounded-xl overflow-hidden glass border border-white/10 hover:border-amber-400/30 transition-all duration-300"
                    >
                        {/* Item image or placeholder */}
                        {item.imageUrl ? (
                            <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800/50">
                                <ImageOff className="h-8 w-8 text-gray-600" />
                            </div>
                        )}

                        {/* Overlay gradient with title */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                            <p className="text-xs font-medium text-white/90 truncate drop-shadow-lg">
                                {item.title}
                            </p>
                            {item.price && (
                                <p className="text-[10px] text-amber-300/80 font-medium">
                                    ${Number(item.price).toFixed(0)}
                                </p>
                            )}
                        </div>

                        {/* Position badge (1-4) */}
                        <div className="absolute top-1.5 left-1.5 h-5 w-5 rounded-full bg-amber-500/90 backdrop-blur-sm flex items-center justify-center">
                            <span className="text-[10px] font-bold text-black">{index + 1}</span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// HaulCard - Post-fulfillment diary entry card with rating, review, and proof photo
// Inspired by Letterboxd's film diary aesthetic

import { Star, Camera } from 'lucide-react';

/** Shape of a single haul entry from the API */
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

interface HaulCardProps {
    haul: HaulEntry;
}

/**
 * HaulCard - Renders a single fulfilled item as a diary-style card.
 * Shows the item image, star rating, optional review, and proof photo.
 */
export default function HaulCard({ haul }: HaulCardProps) {
    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden group hover:shadow-md transition-all">
            <div className="flex gap-3 p-3">
                {/* Item thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800/50">
                    {haul.item.imageUrl ? (
                        <img
                            src={haul.item.imageUrl}
                            alt={haul.item.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Camera className="h-5 w-5 text-gray-600" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Title + date */}
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                            {haul.item.title}
                        </h3>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            Post
                        </span>
                    </div>

                    {/* Star rating - using filled/empty stars */}
                    <div className="flex items-center gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map(n => (
                            <Star
                                key={n}
                                className={`h-3 w-3 ${n <= haul.rating
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-muted/60'
                                    }`}
                            />
                        ))}
                        {haul.item.price && (
                            <span className="text-[10px] text-muted-foreground ml-2">
                                ${Number(haul.item.price).toFixed(0)}
                            </span>
                        )}
                    </div>

                    {/* Review text */}
                    {haul.review && (
                        <div className="mt-2 pl-2 border-l border-primary/20">
                            <p className="text-xs text-muted-foreground font-serif italic line-clamp-2">
                                &ldquo;{haul.review}&rdquo;
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Proof photo (full width, expandable) */}
            {haul.photoUrl && (
                <div className="border-t border-white/5">
                    <img
                        src={haul.photoUrl}
                        alt="Proof"
                        className="w-full h-32 object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                </div>
            )}
        </div>
    );
}

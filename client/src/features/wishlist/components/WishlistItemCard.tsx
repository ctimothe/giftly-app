import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    DollarSign,
    Flame,
    Gift,
    Link as LinkIcon,
    Loader2,
    Lock,
    ShieldCheck,
    Trash2,
    Users,
} from 'lucide-react';
import type { Item } from '../types';

interface WishlistItemCardProps {
    item: Item;
    isOwner: boolean;
    currentIdentifier: string;
    pendingReserve: boolean;
    pendingHype: boolean;
    pendingDelete: boolean;
    contributeLoading: boolean;
    contributeItemId: string;
    onReserveRequest: (itemId: string) => void;
    onContributeRequest: (itemId: string) => void;
    onDelete: (itemId: string) => void;
    onUnreserve: (itemId: string) => void;
    onHypeRequest: (itemId: string) => void;
}

export default function WishlistItemCard({
    item,
    isOwner,
    currentIdentifier,
    pendingReserve,
    pendingHype,
    pendingDelete,
    contributeLoading,
    contributeItemId,
    onReserveRequest,
    onContributeRequest,
    onDelete,
    onUnreserve,
    onHypeRequest,
}: WishlistItemCardProps) {
    return (
        <motion.div
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
                                <Lock size={12} />
                                Reserved
                            </div>
                            {item.reservedBy === currentIdentifier ? (
                                <button
                                    onClick={() => onUnreserve(item.id)}
                                    disabled={pendingReserve}
                                    className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-60 disabled:no-underline"
                                >
                                    {pendingReserve ? 'Cancelling...' : 'Cancel my reservation'}
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
                            onClick={() => onHypeRequest(item.id)}
                            disabled={pendingHype}
                            className="h-8 px-2 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 gap-1 transition-colors"
                        >
                            {pendingHype ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Flame className={`h-4 w-4 ${item.hypeCount > 0 ? 'fill-current' : ''}`} />
                            )}
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

                    {isOwner && Boolean(item.contributionCount) && (
                        <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-600">
                            <Users className="h-3 w-3" />
                            {item.contributionCount} contributors
                        </div>
                    )}

                    <div className="flex gap-2 pt-1">
                        {!isOwner && !item.isReserved && (
                            <>
                                <Button
                                    size="sm"
                                    onClick={() => onReserveRequest(item.id)}
                                    disabled={pendingReserve}
                                    className="flex-1 bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all"
                                >
                                    {pendingReserve ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                        <ShieldCheck className="h-3 w-3 mr-1" />
                                    )}
                                    {pendingReserve ? 'Reserving...' : 'Reserve'}
                                </Button>
                                {item.price && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={contributeLoading && contributeItemId === item.id}
                                        onClick={() => onContributeRequest(item.id)}
                                        className="flex-1 border-border text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                                    >
                                        <DollarSign className="h-3 w-3 mr-1" />
                                        Chip In
                                    </Button>
                                )}
                            </>
                        )}

                        {isOwner && (
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={pendingDelete}
                                onClick={() => onDelete(item.id)}
                                className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 ml-auto transition-all"
                            >
                                {pendingDelete ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                    <Trash2 className="h-3 w-3 mr-1" />
                                )}
                                {pendingDelete ? 'Removing...' : 'Remove'}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

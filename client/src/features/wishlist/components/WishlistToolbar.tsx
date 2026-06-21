import { Activity, Copy, Eye, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WishlistToolbarProps {
    isOwner: boolean;
    hasUser: boolean;
    guestNickname: string;
    viewerCount: number;
    activityCount: number;
    showActivity: boolean;
    onToggleActivity: () => void;
    onShare: () => Promise<void> | void;
}

export default function WishlistToolbar({
    isOwner,
    hasUser,
    guestNickname,
    viewerCount,
    activityCount,
    showActivity,
    onToggleActivity,
    onShare,
}: WishlistToolbarProps) {
    return (
        <div className="flex flex-wrap items-center justify-center gap-3 -mt-6 relative z-10 mb-8">
            <Button
                onClick={onShare}
                variant="outline"
                size="sm"
                className="bg-background/80 backdrop-blur-sm border-border h-9 text-muted-foreground hover:text-foreground active:scale-95 transition-all shadow-sm"
            >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Share
            </Button>

            {isOwner && (
                <div className="bg-background/80 backdrop-blur-sm border border-border inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs text-primary shadow-sm font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Spoiler protection active
                </div>
            )}

            {!hasUser && guestNickname && (
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

            {!isOwner && activityCount > 0 && (
                <button
                    onClick={onToggleActivity}
                    className="bg-background/80 backdrop-blur-sm border border-border inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs text-amber-600 dark:text-amber-400 cursor-pointer hover:bg-muted transition-colors shadow-sm font-medium"
                >
                    <Activity className="h-3.5 w-3.5 text-amber-500" />
                    {activityCount} events {showActivity ? '▲' : '▼'}
                </button>
            )}
        </div>
    );
}

export const THEME_PRESETS: Record<string, { from: string; to: string }> = {
    'violet-pink': { from: '#7c3aed', to: '#ec4899' },
    'blue-cyan': { from: '#2563eb', to: '#06b6d4' },
    'amber-orange': { from: '#f59e0b', to: '#ef4444' },
    'green-teal': { from: '#10b981', to: '#14b8a6' },
    'rose-red': { from: '#f43f5e', to: '#e11d48' },
    'slate-indigo': { from: '#6366f1', to: '#4338ca' },
};

export const getWishlistCacheKey = (wishlistId?: string, userKey?: string) => `giftly:wishlist:${wishlistId || 'unknown'}:${userKey || 'guest'}`;

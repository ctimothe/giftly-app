export interface Item {
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
    contributionCount?: number;
    contributions: Array<{
        id: string;
        amount: number;
        contributorName?: string | null;
        message?: string | null;
        createdAt?: string;
    }>;
}

export interface Wishlist {
    id: string;
    title: string;
    theme?: string;
    ownerId: string;
    isOwner: boolean;
    owner: { id: string; name: string };
    items: Item[];
}

export interface ActivityEvent {
    id: string;
    type: string;
    message: string;
    time: Date;
}

export interface CreateIntent {
    title: string;
    url?: string;
    price?: number | null;
}

export type PendingAction = { type: 'reserve' | 'contribute' | 'hype'; itemId: string };

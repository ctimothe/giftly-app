import BackButton from '@/components/ui/BackButton';

interface WishlistHeroProps {
    title: string;
    ownerName?: string;
    isOwner: boolean;
    theme: { from: string; to: string };
}

export default function WishlistHero({ title, ownerName, isOwner, theme }: WishlistHeroProps) {
    return (
        <div className="relative pt-12 pb-14 px-4 text-center border-b border-border overflow-hidden">
            <div
                className="absolute inset-0 pointer-events-none opacity-25"
                style={{
                    background: `radial-gradient(80% 60% at 20% 20%, ${theme.from} 0%, transparent 60%), radial-gradient(70% 60% at 80% 80%, ${theme.to} 0%, transparent 65%)`,
                }}
            />

            <div className="relative max-w-4xl mx-auto">
                <div className="absolute top-0 left-0">
                    <BackButton label="Home" to="/" />
                </div>
                <div className="inline-block px-3 py-1 bg-primary/5 border border-primary/10 rounded-full text-[10px] font-bold tracking-widest uppercase text-primary mb-6">
                    Curated Collection
                </div>
                <h1 className="text-6xl md:text-8xl font-serif text-foreground tracking-tighter mb-6 italic leading-none">
                    {title}
                </h1>
                <div className="flex items-center justify-center gap-4 text-muted-foreground">
                    <div className="h-px w-8 bg-border" />
                    <p className="text-sm font-medium tracking-wide">
                        {isOwner ? 'Private Archive' : `By ${ownerName || 'an entity'}`}
                    </p>
                    <div className="h-px w-8 bg-border" />
                </div>
            </div>
        </div>
    );
}

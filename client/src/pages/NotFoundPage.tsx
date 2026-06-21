// NotFoundPage — 404 error page with animated gift illustration

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Gift, Home } from 'lucide-react';

/**
 * NotFoundPage — Displayed when user navigates to a non-existent route.
 * Shows a playful error message with an animated gift icon and a CTA to go home.
 */
export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
            <div className="max-w-md w-full rounded-2xl border border-white/10 bg-slate-950/70 p-8 shadow-xl backdrop-blur-sm">
                {/* Animated floating gift icon */}
                <div className="animate-float mb-6">
                    <div className="h-20 w-20 mx-auto rounded-3xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center border border-violet-500/15">
                        <Gift className="h-10 w-10 text-violet-300" />
                    </div>
                </div>

                {/* Error text */}
                <h1 className="text-6xl font-extrabold gradient-text mb-3">404</h1>
                <h2 className="text-xl font-semibold text-foreground mb-2">This gift got lost</h2>
                <p className="text-muted-foreground max-w-sm mb-7 mx-auto">
                    The page you&apos;re looking for doesn&apos;t exist or the wishlist may have been removed.
                </p>

                {/* CTA button */}
                <Button
                    onClick={() => navigate('/')}
                    className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500"
                >
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                </Button>
            </div>
        </div>
    );
}

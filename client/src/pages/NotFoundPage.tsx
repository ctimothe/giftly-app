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
            {/* Animated floating gift icon */}
            <div className="animate-float mb-8">
                <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center border border-violet-500/10">
                    <Gift className="h-12 w-12 text-violet-400" />
                </div>
            </div>

            {/* Error text */}
            <h1 className="text-7xl font-extrabold gradient-text mb-4">404</h1>
            <h2 className="text-xl font-semibold text-white mb-2">This gift got lost!</h2>
            <p className="text-gray-500 max-w-sm mb-8">
                The page you&apos;re looking for doesn&apos;t exist or the wishlist may have been deleted.
            </p>

            {/* CTA button */}
            <Button
                onClick={() => navigate('/')}
                className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500"
            >
                <Home className="mr-2 h-4 w-4" />
                Go Home
            </Button>
        </div>
    );
}

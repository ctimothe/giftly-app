import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface GoogleAuthButtonProps {
    redirectTo?: string;
    onLoadingChange?: (loading: boolean) => void;
}

interface ApiErrorPayload {
    response?: {
        data?: {
            error?: string | { message?: string };
        };
    };
}

/** Google brand-colour logo */
function GoogleLogo() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
    );
}

export default function GoogleAuthButton({ redirectTo = '/', onLoadingChange }: GoogleAuthButtonProps) {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const setLoading = (loading: boolean) => {
        setIsSubmitting(loading);
        onLoadingChange?.(loading);
    };

    /**
     * Sends the Google access_token to the backend, which calls Google's
     * userinfo endpoint to verify it and look up / create the user.
     * Using access_token (from useGoogleLogin popup flow) instead of id_token
     * (from the iframe One-Tap flow) because the popup flow works correctly on
     * all mobile browsers — it navigates to accounts.google.com directly, so
     * the user always sees their existing signed-in accounts.
     */
    const handleGoogleAuth = async (accessToken: string) => {
        const res = await axios.post('/api/auth/google', { accessToken });
        login(res.data.token, res.data.user);
        toast.success('Signed in with Google');
        navigate(redirectTo);
    };

    /**
     * useGoogleLogin opens an actual accounts.google.com popup (or redirect)
     * instead of a Google-hosted iframe.  This means:
     *  - Mobile browsers show existing signed-in Google accounts properly.
     *  - Touch events are reliable — no invisible-overlay hacks needed.
     *  - We get a standard OAuth access_token we send to our backend.
     */
    const triggerGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            try {
                await handleGoogleAuth(tokenResponse.access_token);
            } catch (error) {
                const payload = error as ApiErrorPayload;
                const apiError = payload.response?.data?.error;
                const message = typeof apiError === 'string' ? apiError : apiError?.message;
                toast.error(message || 'Google sign-in failed');
                setLoading(false);
            }
        },
        onError: () => {
            toast.error('Google sign-in failed');
            setLoading(false);
        },
    });

    return (
        <button
            type="button"
            disabled={isSubmitting}
            onClick={() => triggerGoogleLogin()}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
            ) : (
                <GoogleLogo />
            )}
            {isSubmitting ? 'Signing in with Google…' : 'Continue with Google'}
        </button>
    );
}


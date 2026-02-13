// RegisterPage — Premium register with animated orbs + password strength indicator

import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

/**
 * getPasswordStrength — Returns a score 0-4 and label for a password.
 */
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password)) score++;

    const levels = [
        { label: 'Too short', color: 'bg-red-500' },
        { label: 'Weak', color: 'bg-orange-500' },
        { label: 'Fair', color: 'bg-yellow-500' },
        { label: 'Good', color: 'bg-blue-500' },
        { label: 'Strong', color: 'bg-emerald-500' },
    ];
    return { score, ...levels[score] };
}

/**
 * RegisterPage — Full-screen register with the same animated orbs as Login,
 * plus a password strength indicator bar.
 */
export default function RegisterPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Password strength calculation (memoized)
    const strength = useMemo(() => getPasswordStrength(password), [password]);

    // Handle registration form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            const res = await axios.post('/api/auth/register', { name, email, password });
            login(res.data.token, res.data.user);
            toast.success('Account created! Welcome to Giftly');
            navigate('/');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated floating gradient orbs */}
            {/* Clean background */}
            <div className="absolute inset-0 bg-muted/20 pointer-events-none" />

            <Card className="w-full max-w-md relative border-border shadow-lg">
                <CardHeader className="text-center pb-2">
                    {/* Logo */}
                    <div className="flex justify-center mb-4">
                        <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <Gift className="h-7 w-7 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">Create your account</CardTitle>
                    <p className="text-muted-foreground text-sm mt-1">Join Giftly and start sharing wishlists</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-foreground">Name</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name"
                                required
                                className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:ring-ring"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-foreground">Email</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:ring-ring"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-foreground">Password</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:ring-ring"
                            />
                            {/* Password strength indicator */}
                            {password.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex gap-1">
                                        {[0, 1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score - 1 ? strength.color : 'bg-muted'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{strength.label}</p>
                                </div>
                            )}
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</>
                            ) : (
                                <>Create Account <ArrowRight className="ml-2 h-4 w-4" /></>
                            )}
                        </Button>
                    </form>

                    {/* Login link */}
                    <p className="text-center text-sm text-muted-foreground mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                            Sign in
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

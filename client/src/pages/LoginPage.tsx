// LoginPage — Premium login with animated floating orbs background

import { useState } from 'react';
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
 * LoginPage — Full-screen login with animated gradient orbs,
 * branded logo, and styled form inputs.
 */
export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Handle login form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post('/api/auth/login', { email, password });
            login(res.data.token, res.data.user);
            toast.success('Welcome back!');
            navigate('/');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Login failed');
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
                    <CardTitle className="text-2xl font-bold text-foreground">Welcome back</CardTitle>
                    <p className="text-muted-foreground text-sm mt-1">Sign in to manage your wishlists</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-foreground">Email</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:ring-ring"
                                autoFocus
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
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
                            ) : (
                                <>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>
                            )}
                        </Button>
                    </form>

                    {/* Register link */}
                    <p className="text-center text-sm text-gray-500 mt-6">
                        Don&apos;t have an account?{' '}
                        <Link to="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
                            Create one
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

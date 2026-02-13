// Navbar — Persistent glass navigation bar with logo, user avatar, and mobile menu

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Gift, LogOut, User, LayoutDashboard, Menu, X } from 'lucide-react';

/**
 * Navbar — Renders a sticky glassmorphic navigation bar.
 * Shows logo on left, user dropdown on right (or Sign In for guests).
 * On mobile: hamburger menu that slides open.
 */
export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Handle logout and redirect to login page
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Generate user initials for the avatar fallback
    const initials = user?.name
        ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : user?.email?.[0]?.toUpperCase() || '?';

    return (
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo — clickable, navigates to dashboard */}
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
                        <Gift className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="text-lg font-semibold tracking-tight text-foreground hidden sm:block">Giftly</span>
                </Link>

                {/* Desktop: user dropdown or sign-in */}
                <div className="hidden sm:flex items-center gap-3">
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-muted/50 transition-colors cursor-pointer rounded-lg h-auto py-1.5 ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                    {/* Avatar circle with initials */}
                                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground border border-border">
                                        {initials}
                                    </div>
                                    <span className="text-sm text-foreground font-medium hidden md:inline-block max-w-[120px] truncate">{user.name || user.email}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-popover text-popover-foreground border-border shadow-md rounded-lg p-1">
                                {/* User info header */}
                                <div className="px-3 py-2 border-b border-border mb-1">
                                    <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                </div>
                                <DropdownMenuItem onClick={() => navigate('/')} className="cursor-pointer rounded-md focus:bg-accent focus:text-accent-foreground">
                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                    Dashboard
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer rounded-md focus:bg-accent focus:text-accent-foreground">
                                    <User className="mr-2 h-4 w-4" />
                                    Profile
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-border my-1" />
                                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer rounded-md">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => navigate('/login')}
                            className="font-medium px-6"
                        >
                            Sign In
                        </Button>
                    )}
                </div>

                {/* Mobile: hamburger toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="sm:hidden text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle menu"
                >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
            </div>

            {/* Mobile slide-down menu */}
            {mobileOpen && (
                <div className="sm:hidden border-t border-border bg-background px-4 py-4 space-y-2 shadow-lg animate-in slide-in-from-top-2 fade-in duration-200">
                    {user ? (
                        <>
                            {/* User info */}
                            <div className="flex items-center gap-3 px-2 py-3 border-b border-border mb-2">
                                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-sm font-semibold text-secondary-foreground">
                                    {initials}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => { navigate('/'); setMobileOpen(false); }}
                                className="w-full justify-start gap-3 h-10 px-3"
                            >
                                <LayoutDashboard className="h-4 w-4" /> Dashboard
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => { navigate('/profile'); setMobileOpen(false); }}
                                className="w-full justify-start gap-3 h-10 px-3"
                            >
                                <User className="h-4 w-4" /> Profile
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => { handleLogout(); setMobileOpen(false); }}
                                className="w-full justify-start gap-3 h-10 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <LogOut className="h-4 w-4" /> Log out
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="default"
                            onClick={() => { navigate('/login'); setMobileOpen(false); }}
                            className="w-full justify-center gap-2 h-10 font-medium"
                        >
                            <User className="h-4 w-4" /> Sign In
                        </Button>
                    )}
                </div>
            )}
        </nav>
    );
}

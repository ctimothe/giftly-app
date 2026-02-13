// App.tsx — Root application with routing, navbar layout, and global config

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import WishlistPage from './pages/WishlistPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import Navbar from './components/features/Navbar';


// Configure axios base URL globally
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = API_URL;

/**
 * ProtectedRoute — Redirects to /login if user is not authenticated.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  // Show nothing while checking auth state
  if (isLoading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

/**
 * AppRoutes — All routes with page transition animations.
 * Auth pages (login/register) render WITHOUT the navbar.
 * All other pages render WITH the navbar.
 */
function AppRoutes() {
  const location = useLocation();

  // Auth pages don't get the navbar
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Navbar on non-auth pages */}
      {!isAuthPage && <Navbar />}

      {/* Page content with route transition */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <Routes location={location}>
              {/* Auth pages — full-screen, no navbar */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected — dashboard */}
              <Route path="/" element={
                <ProtectedRoute><DashboardPage /></ProtectedRoute>
              } />

              {/* Public - wishlist view (accessible by anyone) */}
              <Route path="/wishlist/:id" element={<WishlistPage />} />

              {/* Protected - profile page */}
              <Route path="/profile" element={
                <ProtectedRoute><ProfilePage /></ProtectedRoute>
              } />

              {/* 404 fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

/**
 * App — Root component wrapping providers around routes.
 */
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        {/* Global toast notifications — clean light theme */}
        <Toaster theme="light" position="top-right" richColors closeButton />
      </AuthProvider>
    </Router>
  );
}

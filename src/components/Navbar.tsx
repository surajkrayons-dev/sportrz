// src/components/Navbar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Menu, X, User, LogOut, Settings, Crown, Sparkles, Mail } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import { useSearch } from '@/contexts/SearchContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAdmin } from '@/contexts/AdminContext';
import { Shield } from 'lucide-react'; // Add Shield icon
import NotificationDropdown from '@/components/NotificationDropdown';
import { useNotification } from '@/contexts/NotificationContext';


const AVATAR_OPTIONS = [
  { id: 'avatar1', emoji: '🎮', name: 'Gamer' },
  { id: 'avatar2', emoji: '🚀', name: 'Rocket' },
  { id: 'avatar3', emoji: '⚡', name: 'Lightning' },
  { id: 'avatar4', emoji: '🎯', name: 'Target' },
  { id: 'avatar5', emoji: '🌟', name: 'Star' },
];

interface NavbarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  totalGames: number;
  filteredCount: number;
}

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { searchTerm, setSearchTerm } = useSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userAvatar, setUserAvatar] = useState('avatar1');
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);
  const [siteName, setSiteName] = useState('Sportrz');
  const { currentUser, logout } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { showToast } = useToast();

  // Read the current public site name so admin settings can update the header without a redeploy.
  useEffect(() => {
    let active = true;
    fetch('/api/public-settings', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => { if (active && typeof data.siteName === 'string' && data.siteName.trim()) setSiteName(data.siteName.trim()); })
      .catch((error) => console.error('Unable to load site settings:', error));
    return () => { active = false; };
  }, []);

  // Load user avatar from MySQL API
  useEffect(() => {
    const loadUserAvatar = async () => {
      if (!currentUser) {
        setUserAvatar('avatar1');
        return;
      }

      setIsLoadingAvatar(true);
      try {
        const response = await fetch('/api/profile', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load avatar.');
        setUserAvatar(result.profile?.avatar || currentUser.avatar || 'avatar1');
      } catch (error) {
        console.error('Error loading user avatar:', error);
        setUserAvatar('avatar1');
      } finally {
        setIsLoadingAvatar(false);
      }
    };

    loadUserAvatar();
  }, [currentUser]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setIsOpen(false);
      setUserAvatar('avatar1'); // Reset avatar on logout
    } catch (error) {
      console.error('Logout failed:', error);
      showToast('Failed to logout. Please try again.', 'error');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getAvatarEmoji = (avatarId: string) => {
    const avatar = AVATAR_OPTIONS.find(a => a.id === avatarId);
    return avatar ? avatar.emoji : '🎮';
  };

  return (
    <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-white/20 dark:border-gray-700/50 sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
  {/* Left Side: Logo + Search */}
<div className="flex items-center">
  {/* Logo + Title */}
<Link href="/" className="flex items-center space-x-2 group">
  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl overflow-hidden">
    <img src="/Logo.png" alt={`${siteName} Logo`} className="w-full h-full object-contain" />
  </div>
        <span className="text-xl font-bold text-[#FD3207]" style={{ fontFamily: "var(--font-vezla)" }}>
  {siteName.toUpperCase()}
</span>
</Link>

  {/* 👇 Push search bar farther right */}
  <div className="hidden md:block relative ml-28"> {/* change ml-16 to ml-20 or more if needed */}
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    <input
      type="text"
      placeholder="Search games..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-96 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
    />
  </div>
</div>



  {/* Right Side: Theme toggle, Premium button, one email access button */}
  <div className="hidden md:flex items-center space-x-8">
    {/* Theme toggle, Premium Plans and account controls */}

            <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>

          {currentUser && <NotificationDropdown />}

{/* Admin Panel Button - Only show for admins */}
{currentUser && isAdmin && !adminLoading && (
  <Link
    href="/admin"
    className="group relative flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white text-sm font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
  >
    <Shield className="w-4 h-4 group-hover:animate-pulse" />
    <span>Admin Panel</span>
  </Link>
)}


            {/* Premium Plans Button */}
            <Link
              href="/plans"
              className="group relative flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
            >
              <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
              <span>Premium Plans</span>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            </Link>

            {currentUser ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/50 dark:to-purple-900/50 border border-indigo-200 dark:border-indigo-700 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-800/50 dark:hover:to-purple-800/50 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center text-lg group-hover:scale-105 transition-transform duration-200">
                    {isLoadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                    ) : (
                      getAvatarEmoji(userAvatar)
                    )}
                  </div>
                  <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="group relative flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white text-sm font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoggingOut ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Signing out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff5526] to-[#ed3424] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-600/20 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Mail className="h-4 w-4" />
                Continue with email
              </Link>
            )}
          </div>
          

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 p-2 rounded-md transition-colors"
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg mt-2 shadow-lg border border-white/20 dark:border-gray-700/50">
              <Link
                href="/"
                className="block text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/about"
                className="block text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>
              <Link
                href="/contact"
                className="block text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </Link>
              {/* Admin Panel Button for Mobile */}
{currentUser && isAdmin && !adminLoading && (
  <Link
    href="/admin"
    className="block w-full text-center bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
    onClick={() => setIsOpen(false)}
  >
    <div className="flex items-center justify-center space-x-2">
      <Shield className="w-4 h-4" />
      <span>Admin Panel</span>
    </div>
  </Link>
)}
              {/* Premium Plans Button for Mobile */}
              <Link
                href="/plans"
                className="block w-full text-center bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Premium Plans</span>
                </div>
              </Link>

              {currentUser ? (
                <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    href="/profile"
                    className="flex items-center px-3 py-2 mb-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/50 dark:to-purple-900/50 border border-indigo-200 dark:border-indigo-700 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-800/50 dark:hover:to-purple-800/50 transition-all duration-200"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center text-lg mr-3">
                      {isLoadingAvatar ? (
                        <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                      ) : (
                        getAvatarEmoji(userAvatar)
                      )}
                    </div>
                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full group relative flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white text-sm font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoggingOut ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Signing out...</span>
                      </>
                    ) : (
                      <>
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="border-t border-gray-200 pb-3 pt-4 dark:border-gray-700">
                  <Link
                    href="/login"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff5526] to-[#ed3424] px-4 py-3 text-center text-sm font-semibold text-white shadow-md shadow-orange-600/20 transition hover:shadow-lg"
                    onClick={() => setIsOpen(false)}
                  >
                    <Mail className="h-4 w-4" />
                    Continue with email
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
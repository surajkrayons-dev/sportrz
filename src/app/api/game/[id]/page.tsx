'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { GameInfo } from '@/types/game';
import { GameTrackingService } from '@/lib/gameTrackingService';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useGameTimer } from '@/hooks/useGameTimer';
import { Clock, Crown, Zap, Lock, User, Edit, Shield, Mail } from 'lucide-react';
import EditGameModal from '@/components/EditGameModal';
import { useAdmin } from '@/contexts/AdminContext';


export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [game, setGame] = useState<GameInfo | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTrialWarning, setShowTrialWarning] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const { currentUser, loading: authLoading } = useAuth();
  const { isSubscribed, subscriptionPlan } = useSubscription();
  
  const { isAdmin, loading: adminLoading } = useAdmin();

  const { 
    timeLeft, 
    isTrialExpired, 
    startTimer, 
    pauseTimer, 
    formatTime 
  } = useGameTimer(isSubscribed, isAdmin);

  const trackGamePlay = async (gameData: any) => {
  if (!currentUser) return;
  
  try {
    const gameInfo = {
      id: gameData.id,
      name: gameData.name,
      categories: gameData.categories || [],
      thumbnail: gameData.thumbnail,
      path: gameData.path
    };
    
    await GameTrackingService.trackGamePlay(currentUser.uid, gameInfo);
  } catch (error) {
    console.error('Failed to track game play:', error);
  }
};

  // Check authentication first
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    // Only load game data if user is authenticated
    if (!currentUser || authLoading) return;
    
    const loadGameData = async () => {
      try {
        const response = await fetch(`/api/games?id=${encodeURIComponent(gameId)}`, { cache: 'no-store' });
        if (response.status === 404) {
          setGame(null);
          return;
        }
        if (!response.ok) throw new Error('Unable to load game from the MySQL API.');
        const gameData = await response.json() as GameInfo;
        setGame(gameData);
        await trackGamePlay(gameData);
      } catch (error) {
        console.error('Error loading game data:', error);
        setGame(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadGameData();

    
  }, [gameId, currentUser, authLoading]);

  // Start timer when game loads
  useEffect(() => {
    if (game && !isSubscribed && currentUser) {
      startTimer();
    }
  }, [game, isSubscribed, currentUser, startTimer]);

  // Show warning when 1 minute left
useEffect(() => {
    if (!isAdmin && !isSubscribed && timeLeft <= 60 && timeLeft > 0) {
      setShowTrialWarning(true);
    }
  }, [timeLeft, isSubscribed, isAdmin]);

  // Handle visibility change to pause/resume timer
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseTimer();
      } else if (game && !isSubscribed && !isTrialExpired) {
        startTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [game, isSubscribed, isTrialExpired, startTimer, pauseTimer]);

  const toggleFullscreen = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (!document.fullscreenElement) {
      iframe.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"></div>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Checking Authentication...</h3>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
              One quick email check
            </h2>
            
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              Verify your email with a one-time code to play. If you are new to Sportrz, your account is created automatically after verification.
            </p>
            
            <div className="space-y-3">
              <Link
                href="/login"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff5526] to-[#ed3424] px-6 py-3 font-semibold text-white transition hover:shadow-lg"
              >
                <Mail className="h-5 w-5" />
                <span>Continue with email</span>
              </Link>
              
              <Link
                href="/"
                className="flex w-full items-center justify-center rounded-lg px-6 py-2 font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while game data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"></div>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Loading Game...</h3>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Game Not Found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The game you're looking for doesn't exist.</p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  // Trial expired overlay
  if (isTrialExpired && !isSubscribed && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Trial Time Expired
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You've used your 5-minute trial
              Upgrade to a premium plan to continue playing without limits!
            </p>
            
            <div className="space-y-3">
              <Link
                href="/plans"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Crown className="w-5 h-5" />
                <span>Upgrade to Premium</span>
              </Link>
              
              <Link
                href="/"
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
              >
                Back to Games
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }



// Add this function to handle game updates
const handleGameUpdate = (updatedGame: GameInfo) => {
    setGame(updatedGame);
    setShowEditModal(false);
    
    // If the ID changed, redirect to the new game page
    if (updatedGame.id !== gameId) {
      router.push(`/game/${updatedGame.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Trial Warning Banner */}
      {showTrialWarning && !isSubscribed && !isAdmin &&(
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 text-center">
          <div className="flex items-center justify-center space-x-2">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">
              Only {formatTime(timeLeft)} left in your trial!
            </span>
            <Link
              href="/plans"
              className="ml-4 bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      )}

      {/* Game Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Games
              </Link>
              <div className="text-sm text-gray-500 dark:text-gray-400">|</div>
            </div>
                          {/* Admin Edit Button */}
              {isAdmin && game && (
                <>
                  <div className="text-sm text-gray-500 dark:text-gray-400">|</div>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 rounded-lg transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    Edit Game
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Admin Badge */}
              {isAdmin && (
                <div className="flex items-center space-x-2 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-lg">
                  <Shield className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
                    Admin
                  </span>
                </div>
              )}
            
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span>
                  {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
                </span>
              </div>
              
              {/* Timer Display */}
              {!isSubscribed && !isAdmin &&(
                <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
                  <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}
                         {/* Admin Access Badge - Show instead of subscription or timer */}
              {isAdmin && (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 px-3 py-2 rounded-lg">
                  <Shield className="w-4 h-4 text-green-700 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Unlimited Access
                  </span>
                </div>
              )}
              
              {/* Subscription Status */}
              {isSubscribed && !isAdmin && (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 px-3 py-2 rounded-lg">
                  <Crown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                    {subscriptionPlan === 'daily' ? 'Daily' : subscriptionPlan === 'weekly' ? 'Weekly' : subscriptionPlan === 'monthly' ? 'Monthly' : 'Premium'} Member
                  </span>
                </div>
              )}
              
              <button
                onClick={toggleFullscreen}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Restart
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Game Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="aspect-video w-full">
            <iframe
              ref={iframeRef}
              id="game-iframe"
              src={game.path}
              className="w-full h-full border-0"
              title={game.name}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </div>
        
        {/* Game Info */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {game.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                HTML5 Game - Use mouse and keyboard to play
              </p>

                      {/* Admin Info Box - Show for admins */}
              {isAdmin && (
                <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="w-5 h-5 text-green-700 dark:text-green-400" />
                    <span className="font-semibold text-green-700 dark:text-green-400">
                      Admin Access
                    </span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    You have unlimited access to all games as an administrator. No time limits or subscription required.
                  </p>
                </div>
              )}

              {/* Trial Info for Non-Subscribers */}
              {!isSubscribed &&!isAdmin &&(
                <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                      Free Trial: {formatTime(timeLeft)} remaining
                    </span>
                  </div>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-3">
                    Enjoying the game? Upgrade to premium for unlimited play time and access to all 500+ games!
                  </p>
                  <Link
                    href="/plans"
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Upgrade Now
                  </Link>
                </div>
              )}
              
              {/* Categories */}
              <div className="flex flex-wrap gap-2 mb-4">
                {game.categories.map((category: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {isSubscribed ? 'Premium' : 'Trial'}
              </span>
            </div>
          </div>
          
      {/* Edit Game Modal */}
      {showEditModal && game && (
        <EditGameModal 
          game={game} 
          onClose={() => setShowEditModal(false)} 
          onSave={handleGameUpdate} 
        />
      )}
    </div>

          {/* Game Controls Info */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Game Controls</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div className="flex items-center">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-xs font-mono mr-2">Mouse</kbd>
                <span>Click and drag to interact</span>
              </div>
              <div className="flex items-center">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-xs font-mono mr-2">Keyboard</kbd>
                <span>Arrow keys and WASD for movement</span>
              </div>
              <div className="flex items-center">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-xs font-mono mr-2">F11</kbd>
                <span>Toggle fullscreen mode</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    
  );
}
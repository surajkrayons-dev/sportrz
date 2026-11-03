'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GameCard from '@/components/GameCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { GameInfo } from '@/types/game';
import CategorySidebar from '@/components/CategorySidebar';

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  // Helper function to extract numeric part from game ID for proper sorting
  const extractNumericId = (gameId: string): number => {
    const match = gameId.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Convert slug to proper category name
  const slugToCategory = (slug: string): string => {
    // Handle special cases
    if (slug === 'top-games') return 'Top Games';
    if (slug === 'recommended-by-sportrz') return 'Recommended by Sportrz';
    
    // General case: convert dash-case to Title Case
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    const fetchCategoryGames = async () => {
      try {
        setLoading(true);
        const properCategoryName = slugToCategory(slug);
        setCategoryName(properCategoryName);
        
        const response = await fetch(`/api/games?category=${encodeURIComponent(properCategoryName)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Unable to load category games.');
        const categoryGames = await response.json() as GameInfo[];
        
        // Sort games by numeric ID
        categoryGames.sort((a, b) => {
          const numA = extractNumericId(a.id);
          const numB = extractNumericId(b.id);
          return numA - numB;
        });
        
        setGames(categoryGames);
      } catch (error) {
        console.error('Error fetching category games:', error);
      } finally {
        setLoading(false);
        // Trigger animations after data loads
        setTimeout(() => setIsVisible(true), 100);
      }
    };

    if (slug) {
      fetchCategoryGames();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900">
        <LoadingSpinner />
      </div>
    );
  }

// In CategoryPage component

return (
  <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900">
    {/* Animated background elements */}
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -top-40 left-1/2 transform -translate-x-1/2 w-80 h-80 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
    </div>

    <div className="relative flex">
      {/* Sidebar - Hidden on mobile (lg breakpoint and up) */}
      <div className="hidden lg:block">
        <CategorySidebar activeCategory={slug} />
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Category Header */}
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center space-x-4">
              <div className="w-1 h-10 sm:h-12 lg:h-14 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                  {categoryName}
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                  {games.length} game{games.length !== 1 ? 's' : ''} available
                </p>
              </div>
            </div>
          </div>

          {/* Back to Home Button */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm"
            >
              <svg className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Back to Home</span>
            </button>
          </div>

          {/* Games Grid */}
          {games.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {games.map((game, index) => (
                <div
                  key={game.id}
                  className={`transform transition-all duration-500 ${
                    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                  }`}
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <GameCard game={game} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20h.01M12 4a8 8 0 100 16 8 8 0 000-16z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">No games found</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                We couldn't find any games in this category. Try exploring other categories.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
}
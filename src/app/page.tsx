'use client';

import { useState, useEffect, useRef } from 'react';
import GameCard from '@/components/GameCard';
import SearchBar from '@/components/SearchBar';
import LoadingSpinner from '@/components/LoadingSpinner';
import Sidebar from '@/components/Sidebar';
import { GameInfo } from '@/types/game';
import { useSearch } from '@/contexts/SearchContext';
import Slider from '@/components/Slider';
import TopGameCard from '@/components/TopGameCard';

export default function Home() {
  const { searchTerm, setSearchTerm, setTotalGames, setFilteredCount } = useSearch();
  const [games, setGames] = useState<GameInfo[]>([]);
  const [filteredGames, setFilteredGames] = useState<GameInfo[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [topGames, setTopGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');

  // Refs for category sliders
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const topGamesRef = useRef<HTMLDivElement | null>(null);
  const [showLeftArrow, setShowLeftArrow] = useState<Record<string, boolean>>({});
  const [showRightArrow, setShowRightArrow] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
    // Trigger animations after component mounts
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  useEffect(() => {
    filterGames();
  }, [searchTerm, games]);

// Enhanced scroll arrow logic - replace the existing useEffect for checking arrows

useEffect(() => {
  const checkArrows = () => {
    // Check top games slider
    if (topGamesRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = topGamesRef.current;
      const canScrollLeft = scrollLeft > 5; // Small buffer for better UX
      const canScrollRight = scrollLeft < scrollWidth - clientWidth - 5; // Small buffer
      
      setShowLeftArrow(prev => ({
        ...prev,
        'top-games': canScrollLeft
      }));
      setShowRightArrow(prev => ({
        ...prev,
        'top-games': canScrollRight
      }));
    }

    // Check category sliders
    categories.forEach((category) => {
      const slider = categoryRefs.current[category];
      if (slider) {
        const { scrollLeft, scrollWidth, clientWidth } = slider;
        const canScrollLeft = scrollLeft > 5; // Small buffer for better UX
        const canScrollRight = scrollLeft < scrollWidth - clientWidth - 5; // Small buffer
        
        setShowLeftArrow(prev => ({
          ...prev,
          [category]: canScrollLeft
        }));
        setShowRightArrow(prev => ({
          ...prev,
          [category]: canScrollRight
        }));
      }
    });
  };

  // Initial check with a delay to ensure DOM is ready
  const timeoutId = setTimeout(checkArrows, 200);

  // Add scroll listeners
  const scrollListeners: (() => void)[] = [];

  if (topGamesRef.current) {
    const handleScroll = () => checkArrows();
    topGamesRef.current.addEventListener('scroll', handleScroll);
    scrollListeners.push(() => {
      if (topGamesRef.current) {
        topGamesRef.current.removeEventListener('scroll', handleScroll);
      }
    });
  }

  categories.forEach((category) => {
    const slider = categoryRefs.current[category];
    if (slider) {
      const handleScroll = () => checkArrows();
      slider.addEventListener('scroll', handleScroll);
      scrollListeners.push(() => {
        if (categoryRefs.current[category]) {
          categoryRefs.current[category]?.removeEventListener('scroll', handleScroll);
        }
      });
    }
  });

  // Also check on window resize
  const handleResize = () => {
    setTimeout(checkArrows, 100);
  };
  window.addEventListener('resize', handleResize);

  return () => {
    clearTimeout(timeoutId);
    scrollListeners.forEach(cleanup => cleanup());
    window.removeEventListener('resize', handleResize);
  };
}, [categories, games, topGames]);

// Additional useEffect to handle initial arrow states when data loads
useEffect(() => {
  if (games.length > 0 && categories.length > 0) {
    // Check arrows after data is loaded and DOM is updated
    const timeoutId = setTimeout(() => {
      const checkArrows = () => {
        // Check top games slider
        if (topGamesRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = topGamesRef.current;
          const canScrollLeft = scrollLeft > 5;
          const canScrollRight = scrollLeft < scrollWidth - clientWidth - 5;
          
          setShowLeftArrow(prev => ({
            ...prev,
            'top-games': canScrollLeft
          }));
          setShowRightArrow(prev => ({
            ...prev,
            'top-games': canScrollRight
          }));
        }

        // Check category sliders
        categories.forEach((category) => {
          const slider = categoryRefs.current[category];
          if (slider) {
            const { scrollLeft, scrollWidth, clientWidth } = slider;
            const canScrollLeft = scrollLeft > 5;
            const canScrollRight = scrollLeft < scrollWidth - clientWidth - 5;
            
            setShowLeftArrow(prev => ({
              ...prev,
              [category]: canScrollLeft
            }));
            setShowRightArrow(prev => ({
              ...prev,
              [category]: canScrollRight
            }));
          }
        });
      };

      checkArrows();
    }, 300);

    return () => clearTimeout(timeoutId);
  }
}, [games, categories, topGames]);

  // Intersection Observer for active category detection
  useEffect(() => {
    if (categories.length === 0 || isSearching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const categoryId = entry.target.id.replace('category-', '');
            setActiveCategoryId(categoryId);
          }
        });
      },
      {
        rootMargin: '-100px 0px -70% 0px',
        threshold: 0.1
      }
    );

    // Observe top games section
    const topGamesElement = document.getElementById('category-top-games');
    if (topGamesElement) {
      observer.observe(topGamesElement);
    }

    categories.forEach((category) => {
      const categoryId = category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const element = document.getElementById(`category-${categoryId}`);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [categories, isSearching, topGames]);

  // Helper function to extract numeric part from game ID for proper sorting
  const extractNumericId = (gameId: string): number => {
    // Extract number from ID like "arcade1", "arcade10", etc.
    const match = gameId.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Function to determine top games (you can customize this logic)
// Function to determine top games
const getTopGames = (allGames: GameInfo[]): GameInfo[] => {
  // Option 1: First 6-8 games with better thumbnails
  // return allGames.slice(0, 6);
  
  // Option 2: Specific featured games (uncomment if you prefer this approach)
  const topGameIds = ['arcade1', 'arcade5', 'arcade10', 'arcade4', 'arcade7'];
  return allGames.filter(game => topGameIds.includes(game.id));
};

  const loadData = async () => {
    try {
      const [gamesResponse, categoriesResponse] = await Promise.all([
        fetch('/api/games', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
      ]);
      if (!gamesResponse.ok) throw new Error('Unable to load games from MySQL API.');
      if (!categoriesResponse.ok) throw new Error('Unable to load categories from MySQL API.');

      const gamesList = await gamesResponse.json() as GameInfo[];
      const categoriesList = await categoriesResponse.json() as string[];
      gamesList.sort((a, b) => extractNumericId(a.id) - extractNumericId(b.id));

      setGames(gamesList);
      setTotalGames(gamesList.length);
      setTopGames(getTopGames(gamesList));
      setCategories(categoriesList);
      setFilteredGames(gamesList);
    } catch (error) {
      console.error('Error loading data:', error);
      setGames([]);
      setCategories([]);
      setFilteredGames([]);
      setTopGames([]);
    } finally {
      setLoading(false);
    }
  };

  const filterGames = () => {
    if (!searchTerm) {
      setFilteredGames(games);
      setFilteredCount(games.length);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const filtered = games.filter(game =>
      game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.id.toString().includes(searchTerm) ||
      game.categories.some((cat: string) => cat.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setFilteredGames(filtered);
    setFilteredCount(filtered.length);
  };

  const getGamesByCategory = (category: string) => {
    // Get games for the category and maintain the sorted order
    return games.filter(game => game.categories.includes(category));
  };

  const handleCategoryClick = (category: string) => {
    if (isSearching) {
      setSearchTerm('');
    }
  };

// Enhanced scroll function with arrow state update
const scrollSlider = (category: string, direction: 'left' | 'right') => {
  const slider = category === 'top-games' ? topGamesRef.current : categoryRefs.current[category];
  if (!slider) return;

  const cardWidth = 200; // Approximate card width
  const gap = 16; // Gap between cards
  const scrollAmount = (cardWidth + gap) * 3; // Scroll 3 cards at a time

  const newScrollLeft = direction === 'left' 
    ? Math.max(0, slider.scrollLeft - scrollAmount)
    : slider.scrollLeft + scrollAmount;

  slider.scrollTo({
    left: newScrollLeft,
    behavior: 'smooth'
  });

  // Update arrow states after scroll animation
  setTimeout(() => {
    const { scrollLeft, scrollWidth, clientWidth } = slider;
    const canScrollLeft = scrollLeft > 5;
    const canScrollRight = scrollLeft < scrollWidth - clientWidth - 5;
    
    setShowLeftArrow(prev => ({
      ...prev,
      [category]: canScrollLeft
    }));
    setShowRightArrow(prev => ({
      ...prev,
      [category]: canScrollRight
    }));
  }, 300); // Wait for scroll animation to complete
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900">
        <LoadingSpinner />
      </div>
    );
  }

  // Add this function to your component to calculate card widths
const getCardWidths = () => {
  // Define breakpoints and card counts
  const breakpoints = {
    xs: { width: 640, cards: 2 },  // < 640px (mobile)
    sm: { width: 768, cards: 3 },  // 640px-768px
    md: { width: 1024, cards: 4 }, // 768px-1024px
    lg: { width: 1280, cards: 5 }, // 1024px-1280px
    xl: { width: 1536, cards: 6 }  // > 1280px
  };
  
  // For top games (larger cards)
  const topGameBreakpoints = {
    xs: { width: 640, cards: 1 },
    sm: { width: 768, cards: 2 },
    md: { width: 1024, cards: 2 },
    lg: { width: 1280, cards: 3 },
    xl: { width: 1536, cards: 3 }
  };
  
  return {
    regular: breakpoints,
    topGames: topGameBreakpoints
  };
};

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
          <Sidebar 
            categories={categories} 
            onCategoryClick={handleCategoryClick}
            activeCategoryId={activeCategoryId}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full">
          {/* Main Content Container */}
          <main className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            {/* Image Slider */}
            <div className="mb-6 sm:mb-8">
              <Slider />
            </div>
            
            {/* Search Results or Category View */}
            {isSearching ? (
              <div className={`transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        Search Results
                      </h2>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                        Found {filteredGames.length} games matching "{searchTerm}"
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="group flex items-center justify-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 hover:shadow-md w-full sm:w-auto"
                  >
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Clear Search</span>
                  </button>
                </div>
                
                {filteredGames.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
                    {filteredGames.map((game: GameInfo, index) => (
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
                  <div className="text-center py-12 sm:py-16 px-4">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                      <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">No games found</h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 max-w-md mx-auto">
                      We couldn't find any games matching your search. Try different keywords or browse our categories.
                    </p>
                    <button
                      onClick={() => setSearchTerm('')}
                      className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-sm sm:text-base"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      Browse All Games
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Category Sections */
              <div className="sm:space-y-4">
{/* Top Games Section */}
{topGames.length > 0 && (
  <div 
    className={`space-y-4 sm:space-y-6 transform transition-all duration-700 ${
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
    }`}
    style={{ transitionDelay: '0ms' }}
    id="category-top-games"
  >
    {/* Top Games Header */}
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="w-1 h-8 sm:h-10 lg:h-12 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-full"></div>
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Featured Games
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Our most popular and trending games
          </p>
        </div>
      </div>
    </div>

    {/* Top Games Slider Container */}
    <div className="relative group">
      {showLeftArrow['top-games'] && (
        <button
          onClick={() => scrollSlider('top-games', 'left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 hover:shadow-xl transform hover:scale-105 opacity-0 group-hover:opacity-100 translate-x-0"
          aria-label="Scroll left"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

{showRightArrow['top-games'] && (
  <button
    onClick={() => scrollSlider('top-games', 'right')}
    className="absolute right-12 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 hover:shadow-xl transform hover:scale-105 opacity-0 group-hover:opacity-100 translate-x-0"
    aria-label="Scroll right"
  >
    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </button>
)}

      {/* Top Games Slider - Using the new TopGameCard component */}
{/* Top Games Slider */}
<div
  ref={topGamesRef}
  className="flex space-x-4 sm:space-x-6 overflow-x-auto scroll-smooth scrollbar-hide pb-6"
  style={{
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  }}
>
  {topGames.map((game: GameInfo, index) => (
    <div
      key={game.id}
      className={`flex-shrink-0 w-[calc(33.333%-16px)] sm:w-[calc(33.333%-24px)] md:w-[calc(33.333%-24px)] lg:w-[calc(33.333%-24px)] transform transition-all duration-500 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      }`}
      style={{ transitionDelay: `${index * 50}ms` }}
    >
      <TopGameCard game={game} index={index} />
    </div>
  ))}
</div>
    </div>
  </div>
)}

                {/* Regular Category Sections */}
                {categories.map((category, categoryIndex) => {
                  const categoryGames = getGamesByCategory(category);
                  const categoryId = category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

                  if (categoryGames.length === 0) return null;

                  return (
                    <div 
                      key={category} 
                      className={`space-y-2 sm:space-y-6 transform transition-all duration-700 ${
                        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                      }`}
                      style={{ transitionDelay: `${(categoryIndex + 1) * 100}ms` }}
                      id={`category-${categoryId}`}
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-1 h-4 sm:h-10 lg:h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                          <div>
                            <h2 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white">
                              {category}
                            </h2>
                          </div>
                        </div>
                      </div>


{/* Games Slider Container */}
<div className="relative group">
  {showLeftArrow[category] && (
    <button
      onClick={() => scrollSlider(category, 'left')}
      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 hover:shadow-xl transform hover:scale-105 opacity-0 group-hover:opacity-100 translate-x-0"
      aria-label={`Scroll ${category} left`}
    >
      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  )}

  {showRightArrow[category] && (
    <button
      onClick={() => scrollSlider(category, 'right')}
      className="absolute right-12 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 hover:shadow-xl transform hover:scale-105 opacity-0 group-hover:opacity-100 translate-x-0"
      aria-label={`Scroll ${category} right`}
    >
      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )}

{/* Games Slider */}
<div
  ref={(el) => {
    if (el) categoryRefs.current[category] = el;
  }}
  className="flex space-x-3 sm:space-x-4 overflow-x-auto scroll-smooth scrollbar-hide pb-4"
  style={{
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  }}
>
  {categoryGames.map((game: GameInfo, index) => (
    <div
      key={game.id}
      className={`flex-shrink-0 transform transition-all duration-500 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      } w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] md:w-[calc(25%-12px)] lg:w-[calc(20%-12px)] xl:w-[calc(16.666%-16px)]`}
      style={{ transitionDelay: `${((categoryIndex + 1) * 100) + (index * 50)}ms` }}
    >
      <GameCard game={game} />
    </div>
  ))}
</div>
</div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

//.
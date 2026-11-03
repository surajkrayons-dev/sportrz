'use client';
import { GameInfo } from '@/types/game';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface GameCardProps {
  game: GameInfo;
}

export default function GameCard({ game }: GameCardProps) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleGameClick = (e: React.MouseEvent) => {
    // If user is not logged in, prevent navigation and show toast
    if (!currentUser) {
      e.preventDefault();
      showToast('Please log in to access games', 'error', 4000);
      router.push('/login');
      return;
    }
    // If user is logged in, allow normal navigation (Link will handle it)
  };

  // Fallback image if the thumbnail fails to load
  const fallbackImage = '/placeholder-game.webp'; // Create this in your public folder
  
  // Get the thumbnail based on game ID
  const getThumbnail = () => {
    // Check if it's one of the special games
    if (game.id === 'arcade4') return '/thumbnails/4.jpg';
    if (game.id === 'arcade5') return '/thumbnails/5.jpg';
    if (game.id === 'arcade10') return '/thumbnails/10.jpg';
    if (game.id === 'platformer1') return '/thumbnails/1.jpg';
    if (game.id === 'shooter20') return '/thumbnails/2.jpg';
    if (game.id === 'simulation10') return '/thumbnails/3.jpg';
  if (game.id === 'casual13') return '/thumbnails/6.jpg';
    
    // For all other games, use the database thumbnail
    return game.thumbnail;
  };

  return (
    <Link 
      href={`/game/${game.id}`} 
      onClick={handleGameClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="block"
    >
      <div 
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-300 ${
          isHovered ? 'shadow-xl border-indigo-300 dark:border-indigo-600 scale-105 -translate-y-1' : ''
        }`}
        style={{ aspectRatio: '16/12' }} // Adjusted aspect ratio to make it taller but still horizontal
      >
        {/* Game Thumbnail Only */}
        <div className="w-full h-full relative overflow-hidden">
          <img 
            src={imageError ? fallbackImage : getThumbnail()} 
            alt={game.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${
              isHovered ? 'scale-110' : 'scale-100'
            }`}
            onError={() => setImageError(true)}
          />
          
          {/* Play overlay - appears only on the hovered card */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-300 flex items-center justify-center ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className={`bg-white/30 backdrop-blur-sm p-2 rounded-full transition-transform duration-300 ${
              isHovered ? 'scale-100' : 'scale-0'
            }`}>
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
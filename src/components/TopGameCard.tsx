'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { GameInfo } from '@/types/game';

interface TopGameCardProps {
  game: GameInfo;
  index: number;
}

export default function TopGameCard({ game, index }: TopGameCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Get the thumbnail based on game ID
  const getThumbnail = () => {
    // Check if it's one of the special games
    if (game.id === 'arcade4') return '/thumbnails/4.jpg';
    if (game.id === 'arcade5') return '/thumbnails/5.jpg';
    if (game.id === 'arcade10') return '/thumbnails/10.jpg';
    
    // For all other games, use the database thumbnail
    return game.thumbnail;
  };
  
  return (
    <div 
      className="relative group cursor-pointer overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105"
      style={{ 
        aspectRatio: '16/9',
        transitionDelay: `${index * 50}ms` 
      }}
      onClick={() => router.push(`/game/${game.id}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div className="w-full h-full overflow-hidden">
        <Image
          src={getThumbnail()}
          alt={game.name}
          width={400}
          height={225}
          className={`w-full h-full object-cover transition-transform duration-700 ${isHovered ? 'scale-110' : 'scale-100'}`}
          priority={index < 4} // Prioritize loading first 4 images
          onError={() => setImageError(true)}
          unoptimized={game.id === 'arcade4' || game.id === 'arcade5' || game.id === 'arcade10'} // Skip optimization for local images
        />
      </div>
      
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-500 ${isHovered ? 'opacity-80' : 'opacity-0'}`}></div>
      
      {/* Play button */}
      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
        <div className="bg-white/30 backdrop-blur-sm p-3 rounded-full">
          <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className={`absolute top-3 right-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-1 transition-all duration-500 ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </div>
    </div>
  );
}
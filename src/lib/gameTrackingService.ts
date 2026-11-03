import { RecentlyPlayedGame } from '@/types/user';
import { GameInfo } from '@/types/game';

async function checkedFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { ...(init?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Game history request failed.');
  return data;
}

export class GameTrackingService {
  static async trackGamePlay(_userId: string, game: GameInfo): Promise<void> {
    await checkedFetch('/api/game-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: game.id }),
    });
  }

  static async getRecentlyPlayedGames(_userId: string): Promise<RecentlyPlayedGame[]> {
    const rows = await checkedFetch('/api/game-tracking', { cache: 'no-store' });
    return (rows as any[]).map((game) => ({ ...game, playedAt: new Date(game.playedAt) }));
  }

  static async clearRecentlyPlayedGames(_userId: string): Promise<void> {
    await checkedFetch('/api/game-tracking', { method: 'DELETE' });
  }

  static async removeFromRecentlyPlayed(_userId: string, gameId: string): Promise<void> {
    await checkedFetch(`/api/game-tracking?gameId=${encodeURIComponent(gameId)}`, { method: 'DELETE' });
  }
}

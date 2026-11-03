import { GameInfo, Review } from '@/types/game';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { ...(init?.headers || {}), ...(init?.body ? { 'Content-Type': 'application/json' } : {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data as T;
}

export const gameService = {
  async getAllGames(): Promise<GameInfo[]> { return request<GameInfo[]>('/api/games', { cache: 'no-store' }); },
  async getGameById(id: string): Promise<GameInfo | null> {
    const response = await fetch(`/api/games?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (response.status === 404) return null;
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load game.');
    return data as GameInfo;
  },
  async getGamesByCategory(category: string): Promise<GameInfo[]> { return request<GameInfo[]>(`/api/games?category=${encodeURIComponent(category)}`); },
  async addGame(game: Omit<GameInfo, 'id'> & { id: string }): Promise<string> {
    const result = await request<{ game: GameInfo }>('/api/admin/games', { method: 'POST', body: JSON.stringify(game) });
    return result.game.id;
  },
  async updateGame(id: string, game: Partial<GameInfo>): Promise<void> {
    await request(`/api/admin/games/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(game) });
  },
  async batchImportGames(games: Record<string, GameInfo>): Promise<void> {
    for (const game of Object.values(games)) {
      await request('/api/admin/games', { method: 'POST', body: JSON.stringify(game) });
    }
  },
};

export const categoryService = {
  async getAllCategories(): Promise<string[]> { return request<string[]>('/api/categories', { cache: 'no-store' }); },
  async addCategory(name: string, order: number): Promise<string> {
    const response = await request<{ slug: string }>('/api/admin/categories', { method: 'POST', body: JSON.stringify({ name, order }) });
    return response.slug;
  },
  async batchImportCategories(categories: string[]): Promise<void> {
    for (const [order, name] of categories.entries()) await this.addCategory(name, order);
  },
};

export const reviewService = {
  async getTopReviews(): Promise<Review[]> { return (await request<{ data: Review[] }>('/api/feedback?type=top')).data; },
  async addReview(review: Omit<Review, 'id' | 'timestamp'>): Promise<string> {
    const response = await request<{ data: { id: string } }>('/api/feedback', { method: 'POST', body: JSON.stringify(review) });
    return response.data.id;
  },
  async getAllReviews(): Promise<Review[]> { return (await request<{ data: Review[] }>('/api/feedback?type=all')).data; },
};

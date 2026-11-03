export interface Feedback {
  id?: string;
  name: string;
  email: string;
  rating: number;
  comment: string;
  createdAt?: Date | string;
  date?: string;
  timestamp?: number;
}
export interface FeedbackForm { name: string; email: string; rating: number; comment: string; }

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { ...(init?.headers || {}), ...(init?.body ? { 'Content-Type': 'application/json' } : {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Feedback request failed.');
  return data as T;
}

export class FeedbackService {
  static async submitFeedback(feedback: FeedbackForm): Promise<string> {
    const response = await request<{ data: { id: string } }>('/api/feedback', { method: 'POST', body: JSON.stringify(feedback) });
    return response.data.id;
  }
  static async getTopReviews(): Promise<Feedback[]> { return (await request<{ data: Feedback[] }>('/api/feedback?type=top')).data; }
  static async getAllFeedback(): Promise<Feedback[]> { return (await request<{ data: Feedback[] }>('/api/feedback?type=all')).data; }
  static calculateAverageRating(reviews: Feedback[]): number { return reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0; }
  static getRatingCounts(reviews: Feedback[]): number[] {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((review) => { if (review.rating >= 1 && review.rating <= 5) counts[5 - review.rating]++; });
    return counts;
  }
}

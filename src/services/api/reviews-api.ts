import { apiRequest } from './client';
import type { Page } from '@/types/api';

export type Review = {
  id: string; productId: string; productName: string; reviewerName: string;
  rating: number; title: string; content: string;
  origin: 'CUSTOMER' | 'ADMIN_ENTERED' | 'IMPORTED'; sourceLabel: string | null;
  verifiedPurchase: boolean; status: 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'HIDDEN';
  createdAt: string; deletedAt: string | null; moderationNote: string | null;
};
export type ModerationAction = 'approve' | 'reject' | 'hide' | 'restore';
export const fetchReviews = (query: Record<string, string | number>) => apiRequest<Page<Review>>('/reviews', { query });
export const moderateReview = (id: string, action: ModerationAction, note: string) =>
  apiRequest<Review>(`/reviews/${encodeURIComponent(id)}/moderate`, { method: 'POST', body: { action, note } });
export const createManualReview = (body: { productId: string; rating: number; title: string; content: string; origin: 'ADMIN_ENTERED' | 'IMPORTED'; sourceLabel: string }) =>
  apiRequest<Review>('/reviews', { method: 'POST', body });

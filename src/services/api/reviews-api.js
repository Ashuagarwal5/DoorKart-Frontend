import { apiRequest } from './client';
export const fetchReviews = (query) => apiRequest('/reviews', { query });
export const moderateReview = (id, action, note) =>
  apiRequest(`/reviews/${encodeURIComponent(id)}/moderate`, { method: 'POST', body: { action, note } });
export const createManualReview = (body) =>
  apiRequest('/reviews', { method: 'POST', body });

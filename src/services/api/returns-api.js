import { apiRequest } from './client';
export const fetchReturns = (query) => apiRequest('/returns', { query });
export const fetchOrderReturns = (id) => apiRequest(`/returns/order/${encodeURIComponent(id)}`);
export const createReturn = (body) => apiRequest('/returns', { method: 'POST', body });
export const returnAction = (id, body) => apiRequest(`/returns/${encodeURIComponent(id)}/actions`, { method: 'POST', body });
export const fetchReconciliation = (from, to) => apiRequest('/returns/reconciliation', { query: { from, to } });

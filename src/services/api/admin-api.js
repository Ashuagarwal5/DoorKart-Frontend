import { apiRequest } from '@/services/api/client';
import { UPLOAD_TIMEOUT_MS } from '@/services/api/config';

/**
 * One function per admin endpoint (/api/v1/admin/...), and nothing else. Business rules
 * live in the backend: these only send what the admin chose and return what the server says.
 */

// ---- Auth -----------------------------------------------------------------------------

export const login = (email, password) =>
  apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
    isAuthCheck: true,
  });

export const logout = () =>
  apiRequest('/auth/logout', { method: 'POST', isAuthCheck: true });

export const fetchMe = (signal) =>
  apiRequest('/auth/me', { signal, isAuthCheck: true });

// ---- Dashboard ------------------------------------------------------------------------

export const fetchDashboard = (signal) =>
  apiRequest('/dashboard', { signal });

// ---- Orders ---------------------------------------------------------------------------

export const fetchOrders = (filters, signal) =>
  apiRequest('/orders', { query: { ...filters }, signal });

export const fetchOrder = (id, signal) =>
  apiRequest(`/orders/${encodeURIComponent(id)}`, { signal });

export const changeOrderStatus = (id, status, note) =>
  apiRequest(`/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: { status, note: note || undefined },
  });

/** Records that the cash for this order was collected (the only payment change that exists). */
export const recordCashCollected = (id, note) =>
  apiRequest(`/orders/${encodeURIComponent(id)}/payment`, {
    method: 'PATCH',
    body: { paymentStatus: 'COLLECTED', note: note || undefined },
  });

// ---- Products and inventory -----------------------------------------------------------

export const fetchProducts = (filters, signal) =>
  apiRequest('/products', { query: { ...filters }, signal });

export const fetchProduct = (id, signal) =>
  apiRequest(`/products/${encodeURIComponent(id)}`, { signal });

/** Uploads one picture or video. The server checks the real file type and size. */
export const uploadMedia = (file, signal) => {
  const form = new FormData();
  form.append('file', file);
  return apiRequest('/uploads', { method: 'POST', body: form, signal, timeoutMs: UPLOAD_TIMEOUT_MS });
};

export const createProduct = (input) =>
  apiRequest('/products', { method: 'POST', body: input });

export const updateProduct = (id, input) =>
  apiRequest(`/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: input });

export const adjustInventory = (id, input) =>
  apiRequest(`/products/${encodeURIComponent(id)}/inventory-adjustment`, {
    method: 'POST',
    body: input,
  });

// ---- Categories and delivery areas ----------------------------------------------------

export const fetchCategories = (signal) =>
  apiRequest('/categories', { signal });

export const createCategory = (input) =>
  apiRequest('/categories', { method: 'POST', body: input });

export const updateCategory = (id, input) =>
  apiRequest(`/categories/${encodeURIComponent(id)}`, { method: 'PATCH', body: input });

export const fetchDeliveryAreas = (signal) =>
  apiRequest('/delivery-areas', { signal });

export const createDeliveryArea = (input) =>
  apiRequest('/delivery-areas', { method: 'POST', body: input });

export const updateDeliveryArea = (id, input) =>
  apiRequest(`/delivery-areas/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });

// ---- Customers ------------------------------------------------------------------------

export const fetchCustomers = (filters, signal) =>
  apiRequest('/customers', { query: { ...filters }, signal });

export const fetchCustomer = (id, signal) =>
  apiRequest(`/customers/${encodeURIComponent(id)}`, { signal });

// ---- Settings (super admin only) ------------------------------------------------------

export const fetchSettings = (signal) => apiRequest('/settings', { signal });

export const saveSettings = (changes) =>
  apiRequest('/settings', { method: 'PATCH', body: { changes } });

/** Sends a test email with the SAVED email settings. A failure carries a safe explanation. */
export const sendTestEmail = (to) =>
  apiRequest('/settings/email/test', { method: 'POST', body: to ? { to } : {}, timeoutMs: 30_000 });

export const createPack = (id, body) => apiRequest('/products/'+encodeURIComponent(id)+'/packs',{method:'POST',body});
export const updatePack = (id,packId,body) => apiRequest('/products/'+encodeURIComponent(id)+'/packs/'+encodeURIComponent(packId),{method:'PATCH',body});

// ---- Own password, staff accounts, order corrections -----------------------------------

export const changeOwnPassword = (currentPassword, newPassword) =>
  apiRequest('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });

export const fetchStaff = (signal) =>
  apiRequest('/staff', { signal });

export const createStaff = (input) =>
  apiRequest('/staff', { method: 'POST', body: input });

export const updateStaff = (id, input) =>
  apiRequest(`/staff/${encodeURIComponent(id)}`, { method: 'PATCH', body: input });

export const resetStaffPassword = (id, newPassword) =>
  apiRequest(`/staff/${encodeURIComponent(id)}/reset-password`, {
    method: 'POST',
    body: { newPassword },
  });

/** Super admin only: puts a mistakenly delivered order (cash not collected) back out for delivery. */
export const reopenDelivery = (id, reason) =>
  apiRequest(`/orders/${encodeURIComponent(id)}/reopen-delivery`, {
    method: 'POST',
    body: { reason },
  });

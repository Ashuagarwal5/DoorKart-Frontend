import { apiRequest } from '@/services/api/client';
import { UPLOAD_TIMEOUT_MS } from '@/services/api/config';
import type {
  AdminProfile,
  Category,
  CategoryCreateInput,
  CategoryUpdateInput,
  Customer,
  CustomerDetail,
  CustomerListFilters,
  DashboardData,
  DeliveryArea,
  DeliveryAreaInput,
  InventoryAdjustmentInput,
  OrderDetail,
  OrderListFilters,
  OrderListItem,
  OrderStatus,
  Page,
  Product,
  ProductCreateInput,
  ProductListFilters,
  ProductUpdateInput,
  SettingsChanges,
  SettingsView,
  UploadedMedia,
} from '@/types/api';

/**
 * One function per admin endpoint (/api/v1/admin/...), and nothing else. Business rules
 * live in the backend: these only send what the admin chose and return what the server says.
 */

// ---- Auth -----------------------------------------------------------------------------

export const login = (email: string, password: string) =>
  apiRequest<{ admin: AdminProfile }>('/auth/login', {
    method: 'POST',
    body: { email, password },
    isAuthCheck: true,
  });

export const logout = () =>
  apiRequest<{ loggedOut: true }>('/auth/logout', { method: 'POST', isAuthCheck: true });

export const fetchMe = (signal?: AbortSignal) =>
  apiRequest<{ admin: AdminProfile }>('/auth/me', { signal, isAuthCheck: true });

// ---- Dashboard ------------------------------------------------------------------------

export const fetchDashboard = (signal?: AbortSignal) =>
  apiRequest<DashboardData>('/dashboard', { signal });

// ---- Orders ---------------------------------------------------------------------------

export const fetchOrders = (filters: OrderListFilters, signal?: AbortSignal) =>
  apiRequest<Page<OrderListItem>>('/orders', { query: { ...filters }, signal });

export const fetchOrder = (id: string, signal?: AbortSignal) =>
  apiRequest<OrderDetail>(`/orders/${encodeURIComponent(id)}`, { signal });

export const changeOrderStatus = (id: string, status: OrderStatus, note?: string) =>
  apiRequest<OrderDetail>(`/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: { status, note: note || undefined },
  });

/** Records that the cash for this order was collected (the only payment change that exists). */
export const recordCashCollected = (id: string, note?: string) =>
  apiRequest<OrderDetail>(`/orders/${encodeURIComponent(id)}/payment`, {
    method: 'PATCH',
    body: { paymentStatus: 'COLLECTED', note: note || undefined },
  });

// ---- Products and inventory -----------------------------------------------------------

export const fetchProducts = (filters: ProductListFilters, signal?: AbortSignal) =>
  apiRequest<Page<Product>>('/products', { query: { ...filters }, signal });

export const fetchProduct = (id: string, signal?: AbortSignal) =>
  apiRequest<Product>(`/products/${encodeURIComponent(id)}`, { signal });

/** Uploads one picture or video. The server checks the real file type and size. */
export const uploadMedia = (file: File, signal?: AbortSignal) => {
  const form = new FormData();
  form.append('file', file);
  return apiRequest<UploadedMedia>('/uploads', { method: 'POST', body: form, signal, timeoutMs: UPLOAD_TIMEOUT_MS });
};

export const createProduct = (input: ProductCreateInput) =>
  apiRequest<Product>('/products', { method: 'POST', body: input });

export const updateProduct = (id: string, input: ProductUpdateInput) =>
  apiRequest<Product>(`/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: input });

export const adjustInventory = (id: string, input: InventoryAdjustmentInput) =>
  apiRequest<Product>(`/products/${encodeURIComponent(id)}/inventory-adjustment`, {
    method: 'POST',
    body: input,
  });

// ---- Categories and delivery areas ----------------------------------------------------

export const fetchCategories = (signal?: AbortSignal) =>
  apiRequest<Category[]>('/categories', { signal });

export const createCategory = (input: CategoryCreateInput) =>
  apiRequest<Category>('/categories', { method: 'POST', body: input });

export const updateCategory = (id: string, input: CategoryUpdateInput) =>
  apiRequest<Category>(`/categories/${encodeURIComponent(id)}`, { method: 'PATCH', body: input });

export const fetchDeliveryAreas = (signal?: AbortSignal) =>
  apiRequest<DeliveryArea[]>('/delivery-areas', { signal });

export const createDeliveryArea = (input: DeliveryAreaInput) =>
  apiRequest<DeliveryArea>('/delivery-areas', { method: 'POST', body: input });

export const updateDeliveryArea = (id: string, input: DeliveryAreaInput) =>
  apiRequest<DeliveryArea>(`/delivery-areas/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });

// ---- Customers ------------------------------------------------------------------------

export const fetchCustomers = (filters: CustomerListFilters, signal?: AbortSignal) =>
  apiRequest<Page<Customer>>('/customers', { query: { ...filters }, signal });

export const fetchCustomer = (id: string, signal?: AbortSignal) =>
  apiRequest<CustomerDetail>(`/customers/${encodeURIComponent(id)}`, { signal });

// ---- Settings (super admin only) ------------------------------------------------------

export const fetchSettings = (signal?: AbortSignal) => apiRequest<SettingsView>('/settings', { signal });

export const saveSettings = (changes: SettingsChanges) =>
  apiRequest<SettingsView>('/settings', { method: 'PATCH', body: { changes } });

/** Sends a test email with the SAVED email settings. A failure carries a safe explanation. */
export const sendTestEmail = (to?: string) =>
  apiRequest<{ sentTo: string }>('/settings/email/test', { method: 'POST', body: to ? { to } : {}, timeoutMs: 30_000 });

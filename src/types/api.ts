/**
 * Shapes of the DoorKart Admin API responses, written from the backend's own code
 * (Backend/src/modules/admin). The backend lives in another project and is the authority:
 * if a response changes there, change it here. All amounts are integer paise.
 * Dates are ISO 8601 strings in UTC.
 */

export const ORDER_STATUSES = [
  'PLACED',
  'CONFIRMED',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'DELIVERY_FAILED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['PENDING', 'COLLECTED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type PaymentMethod = 'COD';
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';

export type Pagination = { page: number; limit: number; total: number; totalPages: number };
export type Page<T> = { items: T[]; pagination: Pagination };

export type AdminProfile = { id: string; name: string; email: string; role: AdminRole };

// ---- Orders ---------------------------------------------------------------------------

export type OrderListItem = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  area: string;
  subtotalPaise: number;
  deliveryChargePaise: number;
  discountPaise: number;
  grandTotalPaise: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
  deliveredAt: string | null;
  itemCount: number;
};

type ChangedBy = { id: string; name: string } | null;

export type OrderDetail = {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: {
    addressLine1: string;
    addressLine2: string | null;
    landmark: string | null;
    area: string;
    city: string;
    pincode: string;
  };
  deliveryAreaId: string;
  items: {
    productId: string;
    productName: string;
    sku: string;
    productImage: string | null;
    unitPricePaise: number;
    quantity: number;
    lineTotalPaise: number;
  }[];
  subtotalPaise: number;
  deliveryChargePaise: number;
  discountPaise: number;
  grandTotalPaise: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  /** The statuses the SERVER allows this order to move to right now. The UI offers only these. */
  allowedNextStatuses: OrderStatus[];
  /** Whether the server will accept "cash collected" for this order right now. */
  canCollectPayment: boolean;
  statusHistory: { status: OrderStatus; note: string | null; createdAt: string; changedBy: ChangedBy }[];
  paymentHistory: {
    fromStatus: PaymentStatus;
    toStatus: PaymentStatus;
    note: string | null;
    createdAt: string;
    changedBy: ChangedBy;
  }[];
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  deliveredAt: string | null;
  paymentCollectedAt: string | null;
};

export type OrderListFilters = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
  /** Shop days as YYYY-MM-DD, both inclusive. */
  from?: string;
  to?: string;
};

// ---- Dashboard ------------------------------------------------------------------------

export type LowStockProduct = {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  availableQuantity: number;
};

export type DashboardData = {
  generatedAt: string;
  today: { start: string; end: string };
  todayOrders: number;
  pendingOrders: number;
  outForDeliveryOrders: number;
  deliveredToday: number;
  /** Grand total of orders delivered today. Not the same as cash collected. */
  todayRevenuePaise: number;
  /** Grand total of orders whose payment was marked collected today. */
  cashCollectedTodayPaise: number;
  /** Cash owed on delivered orders still unpaid. */
  cashPendingPaise: number;
  deliveredUnpaidOrders: number;
  lowStockCount: number;
  ordersByStatus: Record<OrderStatus, number>;
  recentOrders: OrderListItem[];
  lowStockProducts: LowStockProduct[];
};

// ---- Products and inventory -----------------------------------------------------------

export type MediaType = 'IMAGE' | 'VIDEO';

export type ProductMedia = {
  id: string;
  /** A full web address, or a path such as /uploads/… for a file uploaded here. */
  url: string;
  mediaType: MediaType;
  altText: string | null;
  displayOrder: number;
};

/** What the upload endpoint returns for a stored file. */
export type UploadedMedia = { url: string; mediaType: MediaType; sizeBytes: number };

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  sku: string;
  mrpPaise: number;
  sellingPricePaise: number;
  stockQuantity: number;
  reservedQuantity: number;
  /** stockQuantity - reservedQuantity, calculated by the server. */
  availableQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  /** Pictures and videos, in display order. The first picture is the main one. */
  images: ProductMedia[];
  createdAt: string;
  updatedAt: string;
};

export type ProductListFilters = {
  page?: number;
  limit?: number;
  /** Name or SKU. */
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  lowStock?: boolean;
};

export type ProductCreateInput = {
  name: string;
  /** Left out, the server derives it from the name. */
  slug?: string;
  description: string;
  categoryId: string;
  sku: string;
  mrpPaise: number;
  sellingPricePaise: number;
  /** Opening stock. Later changes go through inventory adjustments. */
  stockQuantity: number;
  lowStockThreshold: number;
  isFeatured: boolean;
  isNew: boolean;
  isActive: boolean;
  images: { url: string; mediaType: MediaType; altText?: string | null }[];
};

/** Stock cannot be edited here: the server rejects `stockQuantity` on update. */
export type ProductUpdateInput = Partial<Omit<ProductCreateInput, 'stockQuantity'>>;

export type InventoryAdjustmentInput = { quantityDelta: number; note: string };

// ---- Categories and delivery areas ----------------------------------------------------

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CategoryCreateInput = {
  name: string;
  /** Left out, the server derives it from the name. */
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder?: number;
  isActive?: boolean;
};

export type CategoryUpdateInput = Partial<CategoryCreateInput>;

export type DeliveryArea = {
  id: string;
  name: string;
  pincode: string | null;
  deliveryChargePaise: number;
  minimumOrderPaise: number | null;
  freeDeliveryThresholdPaise: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryAreaInput = {
  name?: string;
  pincode?: string | null;
  deliveryChargePaise?: number;
  /** null clears it (no minimum). */
  minimumOrderPaise?: number | null;
  /** null clears it (no free delivery). */
  freeDeliveryThresholdPaise?: number | null;
  isActive?: boolean;
};

// ---- Customers ------------------------------------------------------------------------

export type Customer = {
  id: string;
  name: string;
  mobile: string;
  createdAt: string;
  /** Every order, cancelled ones included. */
  orderCount: number;
  /** What the customer has bought: cancelled orders are not counted. */
  totalOrderValuePaise: number;
  lastOrderAt: string | null;
};

export type CustomerDetail = Customer & {
  recentOrders: {
    id: string;
    orderNumber: string;
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;
    grandTotalPaise: number;
    createdAt: string;
  }[];
};

export type CustomerListFilters = { page?: number; limit?: number; search?: string };

// ---- Settings (super admin only) -------------------------------------------------------

export type SettingView = {
  key: string;
  label: string;
  description: string | null;
  placeholder: string | null;
  type: 'text' | 'email' | 'number' | 'boolean' | 'password';
  /** A secret's value is never sent to the panel: only whether one is saved. */
  secret: boolean;
  value: string | null;
  isSet: boolean;
  min: number | null;
  max: number | null;
};

export type SettingsView = {
  /** False when the server has no SECRETS_KEY, so a secret cannot be saved yet. */
  secretsKeyConfigured: boolean;
  groups: { id: 'email' | 'google' | 'signin'; title: string; description: string; settings: SettingView[] }[];
};

/** key to new value. null removes the saved value; a key left out is not changed. */
export type SettingsChanges = Record<string, string | null>;

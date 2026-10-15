import { apiRequest } from './client';
import type { Page } from '@/types/api';

export type ReturnKind = 'RETURN_ONLY' | 'REFUND_ONLY' | 'RETURN_REFUND';
export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type ReturnCase = {
  id: string; orderId: string; kind: ReturnKind; status: ReturnStatus; reason: string;
  requestedAmountPaise: number; approvedAmountPaise: number | null; payoutReference: string | null;
  createdAt: string; approvedAt: string | null; rejectedAt: string | null; receivedAt: string | null; completedAt: string | null;
  order: { id: string; orderNumber: string; customerName: string; grandTotalPaise: number; paymentStatus: string; orderStatus: string; deliveredAt: string | null; paymentCollectedAt: string | null };
  items: { components?: {id:string;productId:string;productName:string;quantity:number;sellableQuantity:number;conditionNote:string|null}[]; id: string; orderItemId: string; quantity: number; receivedQuantity: number; sellableQuantity: number; conditionNote: string | null; restockedAt: string | null; orderItem: { packLabel?:string|null; productName: string; productId: string; sku: string } }[];
  events: { id: string; action: string; adminName: string; note: string; createdAt: string; details: Record<string, unknown> }[];
};
export type CreateReturn = { clientRequestId: string; orderId: string; kind: ReturnKind; reason: string; requestedAmountPaise: number; items: { orderItemId: string; quantity: number }[] };
type ActionBase = { requestId: string; note: string };
export type ReturnAction = ActionBase & (
  { action: 'APPROVE'; approvedAmountPaise: number } | { action: 'REJECT' } |
  { action: 'RECEIVE'; items: { itemId: string; receivedQuantity: number; sellableQuantity: number; conditionNote: string; components?:{componentId:string;sellableQuantity:number;conditionNote:string}[] }[] } |
  { action: 'RESTOCK'; itemId: string } | { action: 'COMPLETE'; payoutReference?: string }
);
export type OrderReturns = {
  order: ReturnCase['order'] & { items: { packLabel?:string|null; id: string; productName: string; quantity: number; unitPricePaise: number }[] };
  summary: { collectedPaise: number; completedRefundPaise: number; approvedAwaitingPaise: number; remainingRefundablePaise: number; netCashRetainedPaise: number };
  cases: ReturnCase[];
};
export type Reconciliation = { collectedPaise: number; refundedPaise: number; netCashMovementPaise: number; approvedAwaitingPaise: number; completedCases: number };
export const fetchReturns = (query: Record<string, string | number>) => apiRequest<Page<ReturnCase>>('/returns', { query });
export const fetchOrderReturns = (id: string) => apiRequest<OrderReturns>(`/returns/order/${encodeURIComponent(id)}`);
export const createReturn = (body: CreateReturn) => apiRequest<ReturnCase>('/returns', { method: 'POST', body });
export const returnAction = (id: string, body: ReturnAction) => apiRequest<ReturnCase>(`/returns/${encodeURIComponent(id)}/actions`, { method: 'POST', body });
export const fetchReconciliation = (from: string, to: string) => apiRequest<Reconciliation>('/returns/reconciliation', { query: { from, to } });

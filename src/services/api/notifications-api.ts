import type { Page } from '@/types/api';

import { apiRequest } from './client';

export type NotificationStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'SKIPPED';

export type NotificationOverview = {
  last7Days: Record<NotificationStatus, number>;
  activeDevices: number;
  templates: number;
  enabledTemplates: number;
  queuedEvents: number;
};

export type NotificationTemplate = {
  id: string;
  key: string;
  name: string;
  eventKey: string;
  title: string;
  body: string;
  imageUrl: string | null;
  targetScreen: string | null;
  metadata: Record<string, string> | null;
  isEnabled: boolean;
  createdByAdminId: string | null;
  updatedByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TemplateInput = {
  key: string;
  name: string;
  eventKey: string;
  title: string;
  body: string;
  imageUrl: string | null;
  targetScreen: string | null;
  metadata: Record<string, string> | null;
  isEnabled: boolean;
};

export type NotificationEvent = {
  key: string;
  name: string;
  description: string;
  group: string;
  defaultTarget: string;
  recipient: string;
  isEnabled: boolean;
  variables: string[];
  templates: { id: string; key: string; name: string; eventKey: string; isEnabled: boolean }[];
};

export type NotificationVariable = {
  key: string;
  label: string;
  description: string;
  group: string;
  type: string;
  sensitive?: boolean;
  fallback: string;
  sample: string;
};

export type TargetOption = { key: string; label: string };

export type TemplatePreview = {
  problems: { field: string; message: string }[];
  rendered: { title: string; body: string; pushTitle: string; pushBody: string };
  limits: { title: number; body: number };
  target: { screen: string; params: Record<string, string> };
};

export type NotificationRecord = {
  id: string;
  eventKey: string;
  templateKey: string | null;
  templateName: string | null;
  title: string;
  body: string;
  pushTitle: string;
  pushBody: string;
  targetScreen: string;
  status: NotificationStatus;
  errorCategory: string | null;
  attemptCount: number;
  nextAttemptAt: string;
  createdAt: string;
  processedAt: string | null;
  sentAt: string | null;
  fcmMessageId: string | null;
  reference: string | null;
  entityType: string | null;
  entityId: string | null;
  isTest: boolean;
  readAt: string | null;
  account: { id: string; email: string; fullName: string | null };
};

export type NotificationDetail = NotificationRecord & {
  targetParams: Record<string, string> | null;
  deliveries: {
    id: string;
    attempt: number;
    status: 'SENT' | 'FAILED';
    fcmMessageId: string | null;
    errorCategory: string | null;
    errorMessage: string | null;
    tokenSuffix: string;
    createdAt: string;
  }[];
};

export type DeviceRecord = {
  id: string;
  platform: 'ANDROID' | 'IOS';
  appVersion: string | null;
  tokenSuffix: string;
  lastRegisteredAt: string;
  invalidatedAt: string | null;
  invalidReason: string | null;
  createdAt: string;
  account: { id: string; email: string; fullName: string | null };
};

export type ProviderConfig = {
  secretsKeyConfigured: boolean;
  configured: boolean;
  isEnabled: boolean;
  projectId: string | null;
  clientEmail: string | null;
  privateKeyIdSuffix: string | null;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailureMessage: string | null;
  updatedAt: string | null;
};

const id = (value: string) => encodeURIComponent(value);

export const fetchNotificationOverview = () => apiRequest<NotificationOverview>('/notifications/overview');
export const fetchNotificationEvents = () => apiRequest<NotificationEvent[]>('/notifications/events');
export const setEventEnabled = (key: string, isEnabled: boolean) =>
  apiRequest<NotificationEvent>(`/notifications/events/${id(key)}`, { method: 'PATCH', body: { isEnabled } });
export const fetchNotificationVariables = () => apiRequest<NotificationVariable[]>('/notifications/variables');
export const fetchTargetOptions = () => apiRequest<TargetOption[]>('/notifications/targets');

export const fetchTemplates = (query: Record<string, string | number>) =>
  apiRequest<Page<NotificationTemplate>>('/notifications/templates', { query });
export const fetchTemplate = (templateId: string) =>
  apiRequest<NotificationTemplate>(`/notifications/templates/${id(templateId)}`);
export const createTemplate = (body: TemplateInput) =>
  apiRequest<NotificationTemplate>('/notifications/templates', { method: 'POST', body });
export const updateTemplate = (templateId: string, body: Omit<TemplateInput, 'key'>) =>
  apiRequest<NotificationTemplate>(`/notifications/templates/${id(templateId)}`, { method: 'PUT', body });
export const deleteTemplate = (templateId: string) =>
  apiRequest<{ deleted: true }>(`/notifications/templates/${id(templateId)}`, { method: 'DELETE' });
export const duplicateTemplate = (templateId: string) =>
  apiRequest<NotificationTemplate>(`/notifications/templates/${id(templateId)}/duplicate`, { method: 'POST' });
export const setTemplateEnabled = (templateId: string, isEnabled: boolean) =>
  apiRequest<NotificationTemplate>(`/notifications/templates/${id(templateId)}/enabled`, { method: 'POST', body: { isEnabled } });
export const previewTemplate = (body: { eventKey: string; title: string; body: string; targetScreen: string | null }) =>
  apiRequest<TemplatePreview>('/notifications/templates/preview', { method: 'POST', body });
export const sendTestNotification = (templateId: string, accountEmail: string) =>
  apiRequest<{ id: string; status: NotificationStatus }>(`/notifications/templates/${id(templateId)}/test`, {
    method: 'POST',
    body: { accountEmail },
  });

export const fetchNotificationHistory = (query: Record<string, string | number>) =>
  apiRequest<Page<NotificationRecord>>('/notifications/history', { query });
export const fetchNotificationDetail = (notificationId: string) =>
  apiRequest<NotificationDetail>(`/notifications/history/${id(notificationId)}`);
export const retryNotification = (notificationId: string) =>
  apiRequest<NotificationDetail>(`/notifications/history/${id(notificationId)}/retry`, { method: 'POST' });

export const fetchDevices = (query: Record<string, string | number>) =>
  apiRequest<Page<DeviceRecord>>('/notifications/devices', { query });

export const fetchProviderConfig = () => apiRequest<ProviderConfig>('/notifications/provider');
export const saveProviderCredentials = (body: { projectId: string; serviceAccountJson: string; confirmReplace: boolean }) =>
  apiRequest<ProviderConfig>('/notifications/provider/credentials', { method: 'PUT', body });
export const setProviderEnabled = (isEnabled: boolean) =>
  apiRequest<ProviderConfig>('/notifications/provider', { method: 'PATCH', body: { isEnabled } });
export const testProviderConnection = () =>
  apiRequest<ProviderConfig>('/notifications/provider/test', { method: 'POST' });

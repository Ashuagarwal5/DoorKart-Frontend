import { apiRequest } from './client';

const id = (value) => encodeURIComponent(value);

export const fetchNotificationOverview = () => apiRequest('/notifications/overview');
export const fetchNotificationEvents = () => apiRequest('/notifications/events');
export const setEventEnabled = (key, isEnabled) =>
  apiRequest(`/notifications/events/${id(key)}`, { method: 'PATCH', body: { isEnabled } });
export const fetchNotificationVariables = () => apiRequest('/notifications/variables');
export const fetchTargetOptions = () => apiRequest('/notifications/targets');

export const fetchTemplates = (query) =>
  apiRequest('/notifications/templates', { query });
export const fetchTemplate = (templateId) =>
  apiRequest(`/notifications/templates/${id(templateId)}`);
export const createTemplate = (body) =>
  apiRequest('/notifications/templates', { method: 'POST', body });
export const updateTemplate = (templateId, body) =>
  apiRequest(`/notifications/templates/${id(templateId)}`, { method: 'PUT', body });
export const deleteTemplate = (templateId) =>
  apiRequest(`/notifications/templates/${id(templateId)}`, { method: 'DELETE' });
export const duplicateTemplate = (templateId) =>
  apiRequest(`/notifications/templates/${id(templateId)}/duplicate`, { method: 'POST' });
export const setTemplateEnabled = (templateId, isEnabled) =>
  apiRequest(`/notifications/templates/${id(templateId)}/enabled`, { method: 'POST', body: { isEnabled } });
export const previewTemplate = (body) =>
  apiRequest('/notifications/templates/preview', { method: 'POST', body });
export const sendTestNotification = (templateId, accountEmail) =>
  apiRequest(`/notifications/templates/${id(templateId)}/test`, {
    method: 'POST',
    body: { accountEmail },
  });

export const fetchNotificationHistory = (query) =>
  apiRequest('/notifications/history', { query });
export const fetchNotificationDetail = (notificationId) =>
  apiRequest(`/notifications/history/${id(notificationId)}`);
export const retryNotification = (notificationId) =>
  apiRequest(`/notifications/history/${id(notificationId)}/retry`, { method: 'POST' });

export const fetchDevices = (query) =>
  apiRequest('/notifications/devices', { query });

export const fetchProviderConfig = () => apiRequest('/notifications/provider');
export const saveProviderCredentials = (body) =>
  apiRequest('/notifications/provider/credentials', { method: 'PUT', body });
export const setProviderEnabled = (isEnabled) =>
  apiRequest('/notifications/provider', { method: 'PATCH', body: { isEnabled } });
export const testProviderConnection = () =>
  apiRequest('/notifications/provider/test', { method: 'POST' });

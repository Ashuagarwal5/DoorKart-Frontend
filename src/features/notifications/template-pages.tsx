'use client';

import { useParams } from 'next/navigation';

import { PageHeader } from '@/components/ui/page-header';
import { QueryView } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/use-api-query';
import { fetchTemplate } from '@/services/api/notifications-api';
import { NotificationsNav } from './notifications-nav';
import { TemplateFormLoader } from './template-form';

export function NewTemplatePage() {
  return (
    <>
      <PageHeader title="New template" backHref="/notifications/templates" backLabel="Templates" />
      <NotificationsNav />
      <TemplateFormLoader />
    </>
  );
}

export function EditTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const query = useApiQuery(`notification-template:${id}`, () => fetchTemplate(id));
  return (
    <>
      <PageHeader title="Edit template" backHref="/notifications/templates" backLabel="Templates" />
      <NotificationsNav />
      <QueryView query={query}>{(template) => <TemplateFormLoader key={template.updatedAt} template={template} />}</QueryView>
    </>
  );
}

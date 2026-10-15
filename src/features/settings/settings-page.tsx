import Link from 'next/link';

import { PageHeader } from '@/components/ui/page-header';
import { AppSettings } from '@/features/settings/app-settings';
export function SettingsPage() {
  return <><PageHeader title="Settings" description="Manage your store preferences, customer sign-in and email delivery." actions={<Link className="text-sm text-primary underline" href="/notifications/firebase">Push notification (Firebase) settings</Link>} /><AppSettings /></>;
}

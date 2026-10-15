'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/utils/cn';

const TABS = [
  { href: '/notifications', label: 'Overview', exact: true },
  { href: '/notifications/templates', label: 'Templates' },
  { href: '/notifications/events', label: 'Events' },
  { href: '/notifications/history', label: 'History' },
  { href: '/notifications/devices', label: 'Devices' },
  { href: '/notifications/firebase', label: 'Firebase settings' },
] as const;

/** Section navigation shared by every notifications page. */
export function NotificationsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Notifications sections" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {TABS.map((tab) => {
        const active = 'exact' in tab ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap border-b-2 px-3 py-2 text-sm',
              active ? 'border-primary font-medium text-primary' : 'border-transparent text-muted hover:text-fg'
            )}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

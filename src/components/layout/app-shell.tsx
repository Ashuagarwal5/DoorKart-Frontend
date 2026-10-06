'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type PropsWithChildren, useState } from 'react';

import { isActiveRoute, NAV_ITEMS } from '@/components/layout/nav-items';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { useAdmin } from '@/features/auth/auth-context';
import { useSignOut } from '@/features/auth/use-sign-out';
import { cn } from '@/utils/cn';

const ROLE_LABEL = { SUPER_ADMIN: 'Super admin', ADMIN: 'Admin' } as const;

/**
 * The frame around every signed-in page: a fixed sidebar on desktop and a slide-in drawer
 * on tablets and phones. Only call this once someone is signed in.
 */
export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const admin = useAdmin();
  const { signOut, isSigningOut } = useSignOut();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const nav = (
    <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-3">
      {NAV_ITEMS.map((item) => {
        const isActive = isActiveRoute(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => setIsDrawerOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-bg hover:text-fg'
            )}>
            <Icon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-14 items-center gap-2 border-b border-line px-5">
        <span className="text-lg font-bold text-primary">BuyNest</span>
        <span className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Admin
        </span>
      </div>
      {nav}
      <div className="border-t border-line p-4">
        <p className="truncate text-sm font-medium text-fg">{admin.name}</p>
        <p className="truncate text-xs text-muted">{admin.email}</p>
        <p className="mt-0.5 text-xs text-muted">{ROLE_LABEL[admin.role]}</p>
        <Button size="sm" className="mt-3 w-full" loading={isSigningOut} onClick={signOut}>
          <Icon name="logout" className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop: always visible. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line lg:block">{sidebar}</aside>

      {/* Tablet and phone: a drawer over the page. */}
      {isDrawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-fg/40"
            onClick={() => setIsDrawerOpen(false)}
          />
          <aside
            className="absolute inset-y-0 left-0 w-64 max-w-[85vw] border-r border-line shadow-xl"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setIsDrawerOpen(false);
              }
            }}>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 lg:hidden">
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={isDrawerOpen}
          onClick={() => setIsDrawerOpen(true)}
          className="rounded-md p-2 text-muted hover:bg-bg hover:text-fg">
          <Icon name="menu" />
        </button>
        <span className="font-bold text-primary">BuyNest</span>
        <span className="text-sm text-muted">Admin</span>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

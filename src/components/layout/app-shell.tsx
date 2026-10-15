'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type PropsWithChildren, useEffect, useRef, useState } from 'react';
import { isActiveRoute, NAV_ITEMS } from '@/components/layout/nav-items';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { useAdmin } from '@/features/auth/auth-context';
import { useSignOut } from '@/features/auth/use-sign-out';
import { useNewOrderCount } from '@/hooks/use-new-order-count';
import { useRouteScroll } from '@/hooks/use-route-scroll';
import { cn } from '@/utils/cn';

const ROLE_LABEL = { SUPER_ADMIN: 'Super admin', ADMIN: 'Admin' } as const;

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  useRouteScroll(pathname);
  const admin = useAdmin();
  const { signOut, isSigningOut } = useSignOut();
  const [collapsed, setCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);
  const newOrders = useNewOrderCount(pathname);
  const current = NAV_ITEMS.find(item => isActiveRoute(pathname, item.href));
  const startNavigation = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

  useEffect(() => {
    if (!profileOpen) return;
    const outside = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setProfileOpen(false); profileButton.current?.focus({ preventScroll: true }); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [profileOpen]);

  const navigation = (compact: boolean) => (
    <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-3">
      {NAV_ITEMS.map(item => (
        <Link key={item.href} href={item.href} scroll={false} onNavigate={startNavigation} title={compact ? item.label : undefined}
          aria-label={compact ? item.label : undefined}
          aria-current={isActiveRoute(pathname, item.href) ? 'page' : undefined}
          onClick={() => setIsDrawerOpen(false)}
          className={cn('relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
            compact && 'justify-center', isActiveRoute(pathname, item.href) ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-primary-soft/60 hover:text-primary')}>
          <Icon name={item.icon} />
          {!compact && <span className="flex-1">{item.label}</span>}
          {item.href === '/orders' && newOrders > 0 && <span aria-label={`${newOrders} new orders waiting`}
            className={cn('rounded-full bg-accent text-center text-[10px] font-bold text-white', compact ? 'absolute right-0 top-0 px-1' : 'px-2 py-0.5')}>{newOrders}</span>}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className={cn('min-h-screen print:pl-0', collapsed ? 'lg:pl-20' : 'lg:pl-64')}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-3">Skip to content</a>
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface lg:flex print:hidden', collapsed ? 'w-20' : 'w-64')}>
        <Link href="/" scroll={false} onNavigate={startNavigation} aria-label="DoorKart dashboard" className="flex h-18 shrink-0 items-center gap-2 border-b border-line px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="h-9 w-9 shrink-0 rounded-lg" />
          {!collapsed && <span><span className="block text-lg font-bold text-primary">DoorKart</span><span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Admin workspace</span></span>}
        </Link>
        {navigation(collapsed)}
        <div className="border-t border-line p-3"><Button className="w-full" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}>
          <Icon name="menu" />{!collapsed && 'Collapse sidebar'}
        </Button></div>
      </aside>
      <Modal open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="DoorKart navigation">{navigation(false)}</Modal>
      <header data-admin-header className="sticky top-0 z-20 flex h-18 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8 print:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <Button className="lg:hidden" aria-label="Open navigation" aria-expanded={isDrawerOpen} onClick={() => setIsDrawerOpen(true)}><Icon name="menu" /></Button>
          <div><p className="text-xs text-muted">Store management</p><p className="truncate text-sm font-semibold">{current?.label ?? 'My profile'}</p></div>
        </div>
        <div ref={profileRef} className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setProfileOpen(false); }}>
          <button ref={profileButton} type="button" aria-expanded={profileOpen} aria-controls="profile-dropdown" onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-3 rounded-xl p-2 text-left hover:bg-bg">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">{admin.name.trim().slice(0, 1).toUpperCase() || 'A'}</span>
            <span className="hidden sm:block"><span className="block text-sm font-semibold">{admin.name}</span><span className="block text-xs text-muted">{ROLE_LABEL[admin.role]}</span></span>
            <Icon name="chevronDown" className="h-4 w-4 text-muted" /><span className="sr-only">Account options</span>
          </button>
          {profileOpen && <div id="profile-dropdown" className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-line bg-surface p-2 shadow-xl">
            <p className="truncate border-b border-line px-3 py-3 text-xs text-muted">{admin.email}</p>
            <Link href="/profile" scroll={false} onNavigate={startNavigation} onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-bg"><Icon name="customers" />My profile</Link>
            <Link href="/settings" scroll={false} onNavigate={startNavigation} onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-bg"><Icon name="settings" />Settings</Link>
            <Button className="w-full justify-start" variant="ghost" loading={isSigningOut} onClick={signOut}><Icon name="logout" />Sign out</Button>
          </div>}
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { MotionConfig, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { findCurrentNav, isActiveRoute, NAV_GROUPS, SETTINGS_ITEM } from '@/components/layout/nav-items';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { useAdmin } from '@/features/auth/auth-context';
import { useSignOut } from '@/features/auth/use-sign-out';
import { useSidebarStats } from '@/hooks/use-sidebar-stats';
import { useRouteScroll } from '@/hooks/use-route-scroll';
import { cn } from '@/utils/cn';

const ROLE_LABEL = { SUPER_ADMIN: 'Super admin', ADMIN: 'Admin' };
const compactNumber = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts.at(-1)[0] : parts[0]?.slice(0, 2) ?? 'A').toUpperCase();
}

/** The count pill (or dot) a sidebar item carries, from live numbers only. */
function NavPill({ href, stats, active, compact }) {
  if (href === '/orders' && stats.newOrders > 0) {
    return compact
      ? <span aria-label={`${stats.newOrders} new orders waiting`} className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
      : <span aria-label={`${stats.newOrders} new orders waiting`} className="min-w-5 rounded-md bg-warning-soft px-1.5 py-0.5 text-center text-[11px] font-bold text-warning">{stats.newOrders}</span>;
  }
  if (href === '/products' && stats.products !== null && !compact) {
    return <span aria-label={`${stats.products} products`} className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-bold', active ? 'bg-primary text-on-primary' : 'bg-bg text-muted')}>{compactNumber.format(stats.products)}</span>;
  }
  if (href === '/inventory' && stats.lowStock > 0) {
    return <span aria-label={`${stats.lowStock} products low on stock`} className={cn('h-2 w-2 rounded-full bg-danger', compact && 'absolute right-1.5 top-1.5')} />;
  }
  return null;
}

export function AppShell({ children }) {
  const pathname = usePathname();
  useRouteScroll(pathname);
  const admin = useAdmin();
  const { signOut, isSigningOut } = useSignOut();
  const [collapsed, setCollapsed] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const profileButton = useRef(null);
  const stats = useSidebarStats(pathname);
  const current = findCurrentNav(pathname);
  const startNavigation = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

  useEffect(() => {
    if (!profileOpen) return;
    const outside = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape') { setProfileOpen(false); profileButton.current?.focus({ preventScroll: true }); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [profileOpen]);

  const navLink = (item, compact) => {
    const active = isActiveRoute(pathname, item.href);
    return (
      <Link href={item.href} scroll={false} onNavigate={startNavigation} title={compact ? item.label : undefined}
                      aria-label={compact ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setIsDrawerOpen(false)}
                      className={cn('relative flex min-h-9 items-center gap-3 rounded-lg pl-[19px] pr-3 text-[13.5px] transition-colors',
                        active ? 'bg-primary-soft/70 font-semibold text-primary ring-1 ring-primary/15' : 'font-medium text-muted hover:bg-bg hover:text-fg')}>
                      <Icon name={item.icon} className="h-[18px] w-[18px]" />
                      <span className={cn('flex-1 truncate whitespace-nowrap transition-opacity duration-200', compact ? 'opacity-0' : 'opacity-100')}>{item.label}</span>
                      <NavPill href={item.href} stats={stats} active={active} compact={compact} />
                    </Link>
    );
  };

  const navigation = (compact) => (
    <nav aria-label="Main" className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3">
      {NAV_GROUPS.map(group => {
        const items = group.items.filter(item => !item.superAdminOnly || admin.role === 'SUPER_ADMIN');
        if (items.length === 0) return null;
        return (
          <div key={group.label} className="mt-3 first:mt-3">
            <div aria-hidden="true" className={cn('mx-2 border-t border-line transition-all duration-300', compact ? 'mb-2 opacity-100' : 'mb-0 h-0 border-transparent opacity-0')} />
            <p aria-hidden={compact || undefined} className={cn('overflow-hidden whitespace-nowrap px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted/80 transition-all duration-300', compact ? 'mb-0 h-0 opacity-0' : 'mb-1.5 h-4 opacity-100')}>{group.label}</p>
            <ul className="space-y-0.5">
              {items.map(item => {
                return <li key={item.href}>{navLink(item, compact)}</li>;
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const footer = (compact) => (
    <div className="shrink-0 space-y-0.5 border-t border-line p-2">
      {navLink(SETTINGS_ITEM, compact)}
      <button type="button" disabled={isSigningOut} onClick={signOut} title={compact ? 'Sign out' : undefined} aria-label={compact ? 'Sign out' : undefined}
        className="flex min-h-9 w-full items-center gap-3 rounded-lg pl-[19px] pr-3 text-[13.5px] font-medium text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50">
        <Icon name="logout" className="h-[18px] w-[18px]" />
        <span className={cn('flex-1 truncate whitespace-nowrap text-left transition-opacity duration-200', compact ? 'opacity-0' : 'opacity-100')}>{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
      </button>
    </div>
  );

  const brand = (compact) => (
    <Link href="/" scroll={false} onNavigate={startNavigation} aria-label="DoorKart dashboard" className="flex min-w-0 items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="" className="h-9 w-9 shrink-0 rounded-lg" />
      <span className={cn('min-w-0 whitespace-nowrap transition-opacity duration-200', compact ? 'opacity-0' : 'opacity-100')}>
        <span className="flex items-center gap-1.5"><span className="text-[17px] font-bold leading-tight text-fg">DoorKart</span>
          <span className="rounded bg-primary-soft px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-primary">Admin</span></span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Store ops</span>
      </span>
    </Link>
  );


  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen lg:pl-[72px] print:pl-0">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-3">Skip to content</a>
      {/* Rests as an icon rail and opens over the page while the pointer or keyboard focus is inside it. */}
      <motion.aside initial={false} animate={{ width: collapsed ? 72 : 240 }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        onMouseEnter={() => setCollapsed(false)} onMouseLeave={() => setCollapsed(true)}
        onFocus={() => setCollapsed(false)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setCollapsed(true); }}
        className={cn('fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden border-r border-line bg-surface transition-shadow duration-300 lg:flex print:hidden', !collapsed && 'shadow-2xl')}>
        <div className="relative flex h-16 w-full shrink-0 items-center pl-[18px]">
          {brand(collapsed)}
        </div>
        {navigation(collapsed)}
        {footer(collapsed)}
      </motion.aside>
      <Modal open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="DoorKart navigation">
        <div className="-mx-3 flex flex-col">{navigation(false)}{footer(false)}</div>
      </Modal>
      <header data-admin-header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8 print:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <Button className="lg:hidden" aria-label="Open navigation" aria-expanded={isDrawerOpen} onClick={() => setIsDrawerOpen(true)}><Icon name="menu" /></Button>
          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
              <li className="hidden sm:block">Store</li>
              {current && <><li aria-hidden="true" className="hidden sm:block">/</li><li className="hidden truncate sm:block">{current.group.label}</li></>}
              <li aria-hidden="true" className="hidden sm:block">/</li>
              <li aria-current="page" className="truncate rounded-md border border-line bg-bg px-2 py-0.5 font-semibold text-fg">{current?.item.label ?? 'My profile'}</li>
            </ol>
          </nav>
        </div>
        <div ref={profileRef} className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setProfileOpen(false); }}>
          <button ref={profileButton} type="button" aria-expanded={profileOpen} aria-controls="profile-dropdown" onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-bg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">{initials(admin.name)}</span>
            <span className="hidden sm:block"><span className="block text-sm font-semibold leading-tight">{admin.name}</span><span className="block text-xs text-muted">{ROLE_LABEL[admin.role]}</span></span>
            <Icon name="chevronDown" className="h-4 w-4 text-muted" /><span className="sr-only">Account options</span>
          </button>
          {profileOpen && <div id="profile-dropdown" className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-line bg-surface p-2 shadow-xl">
            <p className="truncate border-b border-line px-3 py-3 text-xs text-muted">{admin.email}</p>
            <Link href="/profile" scroll={false} onNavigate={startNavigation} onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-bg"><Icon name="customers" />My profile</Link>
            <Link href="/settings" scroll={false} onNavigate={startNavigation} onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-bg"><Icon name="settings" />Settings</Link>
          </div>}
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
    </MotionConfig>
  );
}

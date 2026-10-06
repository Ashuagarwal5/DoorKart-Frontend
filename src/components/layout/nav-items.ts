import type { IconName } from '@/components/ui/icons';

/** Only sections the backend supports. */
export const NAV_ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Dashboard', icon: 'dashboard' },
  { href: '/orders', label: 'Orders', icon: 'orders' },
  { href: '/products', label: 'Products', icon: 'products' },
  { href: '/categories', label: 'Categories', icon: 'categories' },
  { href: '/inventory', label: 'Inventory', icon: 'inventory' },
  { href: '/customers', label: 'Customers', icon: 'customers' },
  { href: '/delivery-areas', label: 'Delivery Areas', icon: 'delivery' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

/** Whether `href` is the current section. The dashboard only matches exactly. */
export function isActiveRoute(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

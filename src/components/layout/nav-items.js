/** Only sections the backend supports, grouped the way the sidebar shows them. */
export const NAV_GROUPS = [
  {
    label: "Catalog & Ops",
    items: [
      { href: "/", label: "Dashboard", icon: "dashboard" },
      { href: "/orders", label: "Orders", icon: "orders" },
      { href: "/products", label: "Products", icon: "products" },
      { href: "/categories", label: "Categories", icon: "categories" },
      { href: "/inventory", label: "Inventory", icon: "inventory" },
    ],
  },
  {
    label: "Store Relations",
    items: [
      { href: "/customers", label: "Customers", icon: "customers" },
      { href: "/reviews", label: "Reviews", icon: "star" },
      { href: "/returns", label: "Returns & refunds", icon: "returns" },
      { href: "/delivery-areas", label: "Delivery Areas", icon: "delivery" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/notifications", label: "Notifications", icon: "bell" },
      { href: "/staff", label: "Staff & Access", icon: "staff", superAdminOnly: true },
    ],
  },
];

/** Pinned to the bottom of the sidebar, beside Sign out; the breadcrumb still finds it. */
export const SETTINGS_ITEM = { href: "/settings", label: "Settings", icon: "settings" };

/** Whether `href` is the current section. The dashboard only matches exactly. */
export function isActiveRoute(pathname, href) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** The group and item for the current page, for the header breadcrumb. */
export function findCurrentNav(pathname) {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((entry) => isActiveRoute(pathname, entry.href));
    if (item) return { group, item };
  }
  if (isActiveRoute(pathname, SETTINGS_ITEM.href)) return { group: { label: "Administration" }, item: SETTINGS_ITEM };
  return null;
}

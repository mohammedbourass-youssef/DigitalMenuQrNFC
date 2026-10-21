import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  FolderTree,
  History,
  LayoutDashboard,
  LayoutGrid,
  ListOrdered,
  Settings,
  Building2,
  Languages,
  Sparkles,
  Tags,
  UtensilsCrossed,
  UserRound,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useSidebar } from '@/contexts/SidebarContext';
import { DESKTOP_SIDEBAR_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import { PAYMENTS_COMING_SOON_ENTRY, PAYMENT_STATUS_ENTRY } from '@/components/layout/paymentsNav';
import { HR_SETTINGS_GROUP } from '@/config/hrNavigation';

type SidebarLink = {
  type: 'link';
  href: string;
  labelKey: string;
  defaultLabel?: string;
  icon: LucideIcon;
  end?: boolean;
};

type SidebarGroup = {
  type: 'group';
  labelKey: string;
  defaultLabel?: string;
  icon: LucideIcon;
  children: Array<Pick<SidebarLink, 'href' | 'labelKey' | 'defaultLabel' | 'icon' | 'end'>>;
};

type SidebarEntry = SidebarLink | SidebarGroup;

const navItems: SidebarEntry[] = [
  { type: 'link', href: '/', labelKey: 'sidebar.dashboard', icon: LayoutDashboard, end: true },
  { type: 'link', href: '/menu-items', labelKey: 'sidebar.menuItems', icon: UtensilsCrossed },
  { type: 'link', href: '/categories', labelKey: 'sidebar.categories', icon: FolderTree },
  { type: 'link', href: '/tables', labelKey: 'sidebar.tables', icon: LayoutGrid },
  {
    type: 'group',
    labelKey: 'sidebar.orders',
    icon: ClipboardList,
    children: [
      { href: '/orders/status-settings', labelKey: 'sidebar.orderStatusSettings', icon: Settings },
      { href: '/orders', labelKey: 'sidebar.orders', icon: ListOrdered, end: true },
      { href: '/orders/history', labelKey: 'sidebar.ordersHistory', icon: History },
    ],
  },
  {
    type: 'group',
    labelKey: 'sidebar.paymentsAndTransactions',
    icon: Wallet,
    children: [
      { href: '/payments/invoices', labelKey: 'sidebar.paymentsInvoices', icon: FileText },
      { href: '/payments/methods', labelKey: 'sidebar.paymentMethods', icon: CreditCard },
        {
          href: PAYMENT_STATUS_ENTRY.href,
          labelKey: PAYMENT_STATUS_ENTRY.labelKey,
          icon: PAYMENT_STATUS_ENTRY.icon,
        },
    ],
  },
  HR_SETTINGS_GROUP,
  { type: 'link', href: '/nfc-tags', labelKey: 'sidebar.nfcTags', icon: Tags },
  {
    type: 'group',
    labelKey: 'sidebar.settings',
    icon: Settings,
    children: [
      { href: '/settings/system-preferences', labelKey: 'settings.navigation.systemPreferences', icon: Languages },
      { href: '/settings/restaurant-information', labelKey: 'settings.navigation.restaurantInformation', icon: Building2 },
      { href: '/settings/user-information', labelKey: 'settings.navigation.userInformation', icon: UserRound },
      { href: '/settings/upgrade', labelKey: 'settings.navigation.upgrade', icon: Sparkles },
    ],
  },
];

export default function Sidebar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { collapsed, mobileOpen, closeMobile } = useSidebar();
  const isDesktop = useMediaQuery(DESKTOP_SIDEBAR_QUERY);
  const isRtl = i18n.dir() === 'rtl';

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpanded((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const entry of navItems) {
        if (entry.type !== 'group') continue;
        const isActive = entry.children.some((child) => location.pathname.startsWith(child.href));
        if (isActive && !next[entry.labelKey]) {
          next[entry.labelKey] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobile();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, closeMobile]);

  const toggleGroup = (labelKey: string) => {
    setExpanded((prev) => ({ ...prev, [labelKey]: !prev[labelKey] }));
  };

  const label = (key: string, defaultLabel?: string) => t(key, { defaultValue: defaultLabel ?? key });

  const isOutOfView = isDesktop ? collapsed : !mobileOpen;
  const drawerOffset = isRtl ? 'translate-x-full' : '-translate-x-full';

  return (
    <>
      <div
        onClick={closeMobile}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-200 ease-out motion-reduce:transition-none lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        id="app-sidebar"
        inert={isOutOfView}
        aria-hidden={isOutOfView || undefined}
        className={`fixed inset-y-0 start-0 z-50 flex w-72 shrink-0 flex-col overflow-hidden border-s border-slate-200 bg-white/95 backdrop-blur transition-[transform,width] duration-200 ease-out motion-reduce:transition-none lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : drawerOffset
        } ${collapsed ? 'lg:w-0 lg:border-s-0' : 'lg:w-72'}`}
      >
        <div className="flex h-full w-72 shrink-0 flex-col p-5">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-lg font-bold text-white">
              S
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">Smart Menu NFC</p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t('sidebar.admin')}</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((entry) =>
              entry.type === 'link' ? (
                <NavLink
                  key={entry.href}
                  to={entry.href}
                  end={entry.end ?? false}
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-orange-50 text-orange-600 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <entry.icon className="h-4 w-4 shrink-0" />
                  {label(entry.labelKey)}
                </NavLink>
              ) : (
                <div key={entry.labelKey}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(entry.labelKey)}
                    aria-expanded={expanded[entry.labelKey] ?? false}
                    aria-controls={`sidebar-group-${entry.labelKey}`}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <entry.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-start">{label(entry.labelKey, entry.defaultLabel)}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        expanded[entry.labelKey] ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {expanded[entry.labelKey] && (
                    <div id={`sidebar-group-${entry.labelKey}`} className="mt-1 space-y-1 ps-6">
                      {entry.children.length > 0 &&
                        entry.children.map((child) => (
                          <NavLink
                            key={child.href}
                            to={child.href}
                            end={child.end ?? false}
                            onClick={closeMobile}
                            className={({ isActive }) =>
                              `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                                isActive
                                  ? 'bg-orange-50 text-orange-600 shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`
                            }
                          >
                            <child.icon className="h-4 w-4 shrink-0" />
                            {label(child.labelKey, child.defaultLabel)}
                          </NavLink>
                        ))}
                    </div>
                  )}
                </div>
              )
            )}
          </nav>

          <div className="mt-auto rounded-2xl bg-slate-100 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {t('sidebar.operations')}
            </p>
            <p className="mt-2 text-sm text-slate-700">{t('sidebar.operationsDesc')}</p>
          </div>
        </div>
      </aside>
    </>
  );
}

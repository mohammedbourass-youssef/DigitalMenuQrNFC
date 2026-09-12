import { NavLink } from 'react-router-dom';
import { FolderTree, LayoutDashboard, Tags, UtensilsCrossed, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const navItems = [
  { href: '/', labelKey: 'sidebar.dashboard', icon: LayoutDashboard },
  { href: '/menu-items', labelKey: 'sidebar.menuItems', icon: UtensilsCrossed },
  { href: '/categories', labelKey: 'sidebar.categories', icon: FolderTree },
  { href: '/nfc-tags', labelKey: 'sidebar.nfcTags', icon: Tags },
  { href: '/settings', labelKey: 'sidebar.settings', icon: Settings },
];

export default function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="fixed inset-y-0 start-0 z-30 hidden w-72 border-s border-slate-200 bg-white/90 p-5 backdrop-blur lg:flex lg:flex-col">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-lg font-bold text-white">
          S
        </div>
        <div>
          <p className="text-lg font-bold text-slate-900">Smart Menu NFC</p>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t('sidebar.admin')}</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map(({ href, labelKey, icon: Icon }) => (
          <NavLink
            key={href}
            to={href}
            end={href === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-orange-50 text-orange-600 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl bg-slate-100 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t('sidebar.operations')}</p>
        <p className="mt-2 text-sm text-slate-700">{t('sidebar.operationsDesc')}</p>
      </div>
    </aside>
  );
}

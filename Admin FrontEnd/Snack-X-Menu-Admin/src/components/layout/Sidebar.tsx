import { Link, useLocation } from "wouter";
import { FolderTree, LayoutDashboard, Tags, UtensilsCrossed } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/menu-items", label: "Menu Items", icon: UtensilsCrossed },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/nfc-tags", label: "NFC Tags", icon: Tags },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white/90 p-5 backdrop-blur lg:flex lg:flex-col">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-lg font-bold text-white">
          S
        </div>
        <div>
          <p className="text-lg font-bold text-slate-900">Snack X</p>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Admin</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = location === href;

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-orange-50 text-orange-600 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl bg-slate-100 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Operations</p>
        <p className="mt-2 text-sm text-slate-700">Keep menu, categories, and NFC tags aligned with what's on the floor.</p>
      </div>
    </aside>
  );
}

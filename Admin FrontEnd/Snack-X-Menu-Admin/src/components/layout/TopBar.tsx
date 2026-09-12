import { Bell, Search } from "lucide-react";

export default function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 lg:hidden">
            S
          </div>
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 lg:flex">
            <Search className="h-4 w-4" />
            Search menu, tags, or items
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500" />
          </button>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              JD
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">Jordan Davis</p>
              <p className="text-xs text-slate-500">Shift lead</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

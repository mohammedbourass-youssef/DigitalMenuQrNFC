import { useEffect, useState } from "react";

import { getCategories } from "@/services/categoryService";
import { getMenuItems } from "@/services/menuService";
import { getNFCTags } from "@/services/nfcService";
import type { Category, MenuItem, NFCTag } from "@/types";

export default function DashboardPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<NFCTag[]>([]);

  useEffect(() => {
    const load = async () => {
      const [items, cats, nfcTags] = await Promise.all([
        getMenuItems(),
        getCategories(),
        getNFCTags(),
      ]);

      setMenuItems(items);
      setCategories(cats);
      setTags(nfcTags);
    };

    void load();
  }, []);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard title="Menu items" value={String(menuItems.length)} hint="Total products" />
        <StatCard title="Categories" value={String(categories.length)} hint="Active groupings" />
        <StatCard title="NFC tags" value={String(tags.length)} hint="Currently tracked" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Recent menu snapshot</h2>
          <div className="mt-4 space-y-3">
            {menuItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div>
                  <p className="font-semibold text-slate-800">{item.name}</p>
                  <p className="text-sm text-slate-500">{item.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">${item.price.toFixed(2)}</p>
                  <p className={`text-xs ${item.available ? "text-emerald-600" : "text-red-500"}`}>
                    {item.available ? "Available" : "Unavailable"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Categories</h2>
          <div className="mt-4 space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <div>
                  <p className="font-semibold text-slate-800">{category.name}</p>
                  <p className="text-sm text-slate-500">{category.description}</p>
                </div>
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

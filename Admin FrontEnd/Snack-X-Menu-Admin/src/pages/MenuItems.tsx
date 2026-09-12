import { useEffect, useState } from "react";

import { getMenuItems } from "@/services/menuService";
import type { MenuItem } from "@/types";

export default function MenuItemsPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getMenuItems();
      setItems(data);
      setLoading(false);
    };

    void load();
  }, []);

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Loading menu items...</div>;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Menu Items</h1>
        <button className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white">Add item</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 h-32 rounded-xl bg-slate-200" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{item.name}</p>
                <p className="mt-1 text-sm text-slate-500">{item.description}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs ${item.available ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {item.available ? "Available" : "Unavailable"}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900">${item.price.toFixed(2)}</span>
              <button className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700">Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

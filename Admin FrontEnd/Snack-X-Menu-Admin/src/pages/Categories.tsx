import { useEffect, useState } from "react";

import { getCategories } from "@/services/categoryService";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await getCategories();
      setCategories(data);
    };

    void load();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
        <button className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white">New category</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((category) => (
          <div key={category.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                <p className="font-semibold text-slate-900">{category.name}</p>
              </div>
              <button className="text-sm font-medium text-slate-600">Edit</button>
            </div>
            <p className="mt-3 text-sm text-slate-500">{category.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

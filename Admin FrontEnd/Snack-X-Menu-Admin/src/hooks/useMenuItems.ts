import { useCallback, useEffect, useState } from "react";

import { getMenuItems } from "@/services/menuService";
import type { MenuItem } from "@/types";

export const useMenuItems = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getMenuItems();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load menu items.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  return { items, loading, error, refetch: loadItems };
};

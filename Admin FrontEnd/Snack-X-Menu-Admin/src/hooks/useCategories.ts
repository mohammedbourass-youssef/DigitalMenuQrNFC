import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import axiosInstance, { getAuthHeaders } from '@/lib/axios';
import type { CategoryComboResponse, CategoryOption } from '@/types/menuItem';

const fetchCategories = async (
  language: string,
  query: string
): Promise<CategoryOption[]> => {
  const response = await axiosInstance.get<CategoryComboResponse>('Cateogries/combo', {
    params: { Language: language, Query: query },
    headers: getAuthHeaders(),
  });

  const body = response.data;
  const items = Array.isArray(body?.data) ? body.data : [];

  return items.map((item) => ({
    id: item.id,
    name: item.name ?? '',
    desc: item.desc ?? '',
    color: item.color || '#94a3b8',
  }));
};

export function useCategories(search: string) {
  const { i18n } = useTranslation();
  const language = i18n.language || 'en';

  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  return useQuery({
    queryKey: ['categories-combo', language, debouncedSearch],
    queryFn: () => fetchCategories(language, debouncedSearch),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}
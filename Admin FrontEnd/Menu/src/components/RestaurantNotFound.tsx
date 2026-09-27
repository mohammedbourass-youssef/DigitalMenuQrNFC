import { Store } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function RestaurantNotFound() {
  const { t } = useLanguage();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-gray-50 px-8 pt-safe pb-safe">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-200/70 text-gray-500">
        <Store className="h-10 w-10" />
      </div>
      <h1 className="text-center text-xl font-extrabold text-gray-900">{t('restaurantNotFound')}</h1>
      <p className="max-w-[260px] text-center text-sm leading-relaxed text-gray-500">{t('restaurantNotFoundHint')}</p>
    </div>
  );
}
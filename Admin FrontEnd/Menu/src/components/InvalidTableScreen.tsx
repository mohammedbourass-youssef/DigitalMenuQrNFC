import { Tag } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function InvalidTableScreen({ onContinue }: { onContinue: () => void }) {
  const { t } = useLanguage();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-gray-50 px-8 pt-safe pb-safe">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-200/70 text-gray-500">
        <Tag className="h-10 w-10" />
      </div>
      <h1 className="text-center text-xl font-extrabold text-gray-900">{t('invalidTable')}</h1>
      <p className="max-w-[280px] text-center text-sm leading-relaxed text-gray-500">{t('invalidTableHint')}</p>
      <button
        type="button"
        onClick={onContinue}
        className="mt-2 flex h-12 items-center justify-center rounded-2xl bg-brand px-8 text-base font-extrabold text-white shadow-lg transition-transform active:scale-[0.98]"
      >
        {t('continueBrowsing')}
      </button>
    </div>
  );
}
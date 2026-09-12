import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/types';

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'ar', label: 'AR', flag: '🇲🇦' },
];

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-1 rounded-full bg-black/5 p-1">
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold transition-all duration-200 ${
            lang === l.code
              ? 'bg-white text-gray-900 shadow-sm scale-105'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          aria-label={l.label}
        >
          <span className="text-sm leading-none">{l.flag}</span>
          <span>{l.label}</span>
        </button>
      ))}
    </div>
  );
}

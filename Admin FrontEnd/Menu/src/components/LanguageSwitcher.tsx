import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { hapticFeedback } from '@/lib/haptics';
import type { Language } from '@/types';
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '@/lib/constants';
import { Globe, Check } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);

  const handleSelect = (code: Language) => {
    setLang(code);
    hapticFeedback(5);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Language"
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 text-white backdrop-blur transition-transform active:scale-95"
      >
        <Globe className="h-5 w-5" />
        <span className="text-xs font-extrabold tracking-wider">{lang.toUpperCase()}</span>
      </button>

      <BottomSheet open={open} onDismiss={() => setOpen(false)} header={{ title: 'Language', onClose: () => setOpen(false) }}>
        <div className="sheet-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-safe pt-2">
          <div className="flex flex-col gap-2 px-0">
            {SUPPORTED_LANGUAGES.map((code) => {
              const label = LANGUAGE_LABELS[code];
              const active = lang === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleSelect(code)}
                  role="option"
                  aria-selected={active}
                  className={`flex h-14 w-full items-center justify-between rounded-2xl px-4 transition active:scale-[0.98] ${
                    active ? 'bg-brand/10 text-brand ring-1 ring-brand/20' : 'bg-gray-50 text-gray-700 active:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl leading-none">{label.flag}</span>
                    <span className="text-sm font-extrabold tracking-wide">{label.nativeName}</span>
                    <span className="text-xs font-semibold text-gray-400">{code.toUpperCase()}</span>
                  </span>
                  {active && <Check className="h-5 w-5 text-brand" />}
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
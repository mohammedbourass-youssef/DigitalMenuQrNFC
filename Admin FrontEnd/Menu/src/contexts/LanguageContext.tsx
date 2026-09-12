import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Language, Direction, LocalizedString } from '../types';
import { uiStrings } from '../translations';

interface LanguageContextValue {
  lang: Language;
  dir: Direction;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  tl: (value: LocalizedString) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  const dir: Direction = lang === 'ar' ? 'rtl' : 'ltr';

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const t = useCallback(
    (key: string): string => {
      const entry = uiStrings[key];
      if (!entry) return key;
      return entry[lang] ?? entry.en;
    },
    [lang],
  );

  const tl = useCallback(
    (value: LocalizedString): string => {
      return value[lang] ?? value.en;
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, dir, setLang, t, tl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Language, Direction, LocalizedString } from '../types';
import { uiStrings } from '../translations';
import { LANG_KEY, resolveInitialLang, setActiveLang } from '../lib/lang';
import { storageSet } from '../lib/storage';
import { RTL_LANGUAGES } from '../lib/constants';

interface LanguageContextValue {
  lang: Language;
  dir: Direction;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  tl: (value: LocalizedString) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const hasPref = useRef(false);
  const [lang, setLangState] = useState<Language>(() => {
    const initial = resolveInitialLang();
    // Seed the module mirror during the first render so any request fired by a
    // child effect already carries the right X-Lang.
    setActiveLang(initial);
    return initial;
  });

  const dir: Direction = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';

  const setLang = useCallback((newLang: Language) => {
    hasPref.current = true;
    setLangState(newLang);
    storageSet(LANG_KEY, newLang);
  }, []);

  // Keep the request-time mirror in step with every switch, so the next request
  // uses the new language without a reload.
  useEffect(() => {
    setActiveLang(lang);
  }, [lang]);

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
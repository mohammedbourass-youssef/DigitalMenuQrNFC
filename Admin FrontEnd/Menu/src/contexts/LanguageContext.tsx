import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Language, Direction, LocalizedString } from '../types';
import { uiStrings } from '../translations';
import { tenantScopedKey } from '../lib/tenant';
import { storageGet, storageSet } from '../lib/storage';
import { detectDeviceLanguage } from '../lib/detectLanguage';
import { RTL_LANGUAGES, SUPPORTED_LANGUAGES } from '../lib/constants';

const LANG_KEY = tenantScopedKey('lang');

const SUPPORTED: readonly Language[] = SUPPORTED_LANGUAGES;

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
    const stored = storageGet<Language | null>(LANG_KEY, null);
    if (stored && SUPPORTED.includes(stored)) {
      hasPref.current = true;
      return stored;
    }
    return detectDeviceLanguage();
  });

  const dir: Direction = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';

  const setLang = useCallback((newLang: Language) => {
    hasPref.current = true;
    setLangState(newLang);
    storageSet(LANG_KEY, newLang);
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
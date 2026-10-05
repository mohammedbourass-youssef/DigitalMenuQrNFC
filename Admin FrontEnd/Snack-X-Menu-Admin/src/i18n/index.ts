import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import de from './locales/de.json';
import es from './locales/es.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import zh from './locales/zh.json';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  ar: { translation: ar },
  // These carry the `orderPayment` namespace only; every other namespace falls
  // back to English until it gets translated.
  de: { translation: de },
  es: { translation: es },
  it: { translation: it },
  ja: { translation: ja },
  ko: { translation: ko },
  zh: { translation: zh },
};

const SUPPORTED = ['ar', 'de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'zh'];

const getInitialLanguage = () => {
  const stored = localStorage.getItem('app-language');
  if (stored && SUPPORTED.includes(stored)) {
    return stored;
  }

  return 'en';
};

const applyDirection = (language: string) => {
  const isRTL = language === 'ar';
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

applyDirection(i18n.language);

i18n.on('languageChanged', (language) => {
  localStorage.setItem('app-language', language);
  applyDirection(language);
});

export default i18n;
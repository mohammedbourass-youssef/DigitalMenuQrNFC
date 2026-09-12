import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  ar: { translation: ar },
};

const getInitialLanguage = () => {
  const stored = localStorage.getItem('app-language');
  if (stored === 'fr' || stored === 'ar' || stored === 'en') {
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

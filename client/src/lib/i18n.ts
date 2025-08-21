import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(resourcesToBackend((language: string, namespace: string) => import(`../translations/${language}.yaml`)))
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'en', // default language
    fallbackLng: 'en',
    debug: true,
    
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    
    react: {
      useSuspense: false,
    },
    
    // Load all namespaces
    ns: ['translation'],
    defaultNS: 'translation',
    
    // Save to localStorage
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'app-language',
    },
  });

export default i18n;
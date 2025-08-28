import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import * as yaml from 'js-yaml';

// Custom resource loader for YAML files in public directory
const yamlResourceLoader = (language: string, namespace: string) => {
  return fetch(`/translations/${language}.yaml`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load translation file: ${language}.yaml`);
      }
      return response.text();
    })
    .then((yamlContent) => {
      return yaml.load(yamlContent) as Record<string, any>;
    });
};

i18n
  .use(resourcesToBackend(yamlResourceLoader))
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'en', // default language
    fallbackLng: 'en',
    debug: false,
    
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
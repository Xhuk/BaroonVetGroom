import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => void;
  availableLanguages: { code: string; name: string; flag: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const availableLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');

  useEffect(() => {
    // Load saved language from localStorage only on mount
    const savedLanguage = localStorage.getItem('app-language');
    if (savedLanguage && savedLanguage !== i18n.language) {
      setCurrentLanguage(savedLanguage);
      i18n.changeLanguage(savedLanguage);
    }
    console.log('LanguageContext initialized:', { currentLanguage, savedLanguage, available: availableLanguages });
  }, []); // Empty dependency array to run only on mount

  const changeLanguage = (language: string) => {
    console.log('Changing language from', currentLanguage, 'to', language);
    setCurrentLanguage(language);
    i18n.changeLanguage(language);
    localStorage.setItem('app-language', language);
  };

  const value = {
    currentLanguage,
    changeLanguage,
    availableLanguages,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
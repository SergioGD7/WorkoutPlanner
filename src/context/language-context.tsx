"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import en from '@/locales/en.json';
import es from '@/locales/es.json';

type Language = 'en' | 'es';
type Translations = { [key: string]: string };

const translations: Record<Language, Translations> = { en, es };

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'es') {
      setLanguage('es');
    } else {
      setLanguage('en');
    }
  }, []);

  const t = useCallback((key: string, replacements?: { [key: string]: string | number }) => {
    let translation = translations[language][key];
    if (translation === undefined) {
      // Fallback to English
      translation = translations['en'][key];
      if (translation === undefined) {
        console.warn(`Translation not found for key: ${key}`);
        return key;
      }
    }

    if (replacements) {
      Object.keys(replacements).forEach((placeholder) => {
        translation = translation.replace(`{${placeholder}}`, String(replacements[placeholder]));
      });
    }

    return translation;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import exercisesEn from '@/locales/exercises-en.json';
import exercisesEs from '@/locales/exercises-es.json';

type Language = 'en' | 'es';
type Translations = { [key: string]: string };

/**
 * UI strings and exercise names are kept in separate files and merged here.
 *
 * The exercise catalogue is content, not chrome: 574 generated names and
 * descriptions per language, rewritten wholesale by
 * `scripts/import-exercise-library.mjs`. Mixing them into the hand-written UI
 * strings would mean a generated file nobody can review and a merge conflict
 * every time either side changes.
 */
const translations: Record<Language, Translations> = {
  en: { ...en, ...exercisesEn },
  es: { ...es, ...exercisesEs },
};

const STORAGE_KEY = 'workoutPlanner.language';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function detectBrowserLanguage(): Language {
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  return candidates.some((lang) => lang?.toLowerCase().startsWith('es')) ? 'es' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // An explicit choice must survive a reload; only fall back to the browser
  // locale when the user has never picked one.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setLanguageState(stored === 'en' || stored === 'es' ? stored : detectBrowserLanguage());
  }, []);

  // Keeps screen readers and the browser translator in sync with the content.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string, replacements?: { [key: string]: string | number }) => {
      let translation = translations[language][key] ?? translations.en[key];

      if (translation === undefined) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Translation not found for key: ${key}`);
        }
        return key;
      }

      if (replacements) {
        Object.keys(replacements).forEach((placeholder) => {
          translation = translation.replace(`{${placeholder}}`, String(replacements[placeholder]));
        });
      }

      return translation;
    },
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { translations, type Language, type TranslationDictionary } from "@/i18n";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "vegito.language";

function resolveKey(obj: any, path: string): string | undefined {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
      if (stored === "en" || stored === "mr" || stored === "hi") {
        setLanguageState(stored);
      }
    } catch (e) {
      console.warn("Failed to load language from localStorage", e);
    } finally {
      setMounted(true);
    }
  }, []);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("lang", newLang);
      }
    } catch (e) {
      console.warn("Failed to persist language in localStorage", e);
    }
  };

  const currentDict = useMemo(() => translations[language] || translations.en, [language]);

  const t = useMemo(() => {
    return (keyPath: string, fallback?: string): string => {
      const val = resolveKey(currentDict, keyPath);
      if (val !== undefined) return val;
      // Fallback to English dictionary
      const enVal = resolveKey(translations.en, keyPath);
      if (enVal !== undefined) return enVal;
      return fallback ?? keyPath;
    };
  }, [currentDict]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

// Alias for convenience
export const useTranslation = useI18n;

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import enTranslations from "../translations/en.json";
import hiTranslations from "../translations/hi.json";
import mrTranslations from "../translations/mr.json";

type Language = "en" | "hi" | "mr";

type TranslationValue = string | string[] | Record<string, any>;

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string>) => TranslationValue;
  hasSelectedLanguage: boolean;
};

const translations = {
  en: enTranslations,
  hi: hiTranslations,
  mr: mrTranslations
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: () => "",
  hasSelectedLanguage: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    // Try to get language from localStorage
    const savedLanguage = localStorage.getItem("language");
    return (savedLanguage as Language) || "mr";
  });
  
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);

  // Update localStorage when language changes
  useEffect(() => {
    localStorage.setItem("language", language);
    setHasSelectedLanguage(true);
  }, [language]);

  const interpolate = (value: TranslationValue, params?: Record<string, string>): TranslationValue => {
    if (!params) return value;
    if (typeof value === 'string') {
      // Replace bracketed placeholders like [crop], [market], etc.
      return value.replace(/\[(.+?)\]/g, (match, p1) => {
        const replacement = params[p1 as string];
        return replacement !== undefined ? replacement : match;
      });
    }
    if (Array.isArray(value)) {
      return value.map(v => typeof v === 'string' ? (interpolate(v, params) as string) : v);
    }
    return value;
  };

  const t = (key: string, params?: Record<string, string>): TranslationValue => {
    const parts = key.split('.');
    let node: any = translations[language];

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (node && node[p] !== undefined) {
        node = node[p];
        continue;
      }
      // Fallback: support flat keys inside current node, e.g., qa['market.price.modal']
      const remainder = parts.slice(i).join('.');
      if (node && node[remainder] !== undefined) {
        node = node[remainder];
        break;
      }
      return key;
    }
    return interpolate(node as TranslationValue, params);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, hasSelectedLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => useContext(LanguageContext);

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import enTranslations from "../translations/en.json";
import hiTranslations from "../translations/hi.json";
import mrTranslations from "../translations/mr.json";
// import bnTranslations from "../translations/bn.json";
// import taTranslations from "../translations/ta.json";
// import teTranslations from "../translations/te.json";
// import knTranslations from "../translations/kn.json";
// import mlTranslations from "../translations/ml.json";
// import guTranslations from "../translations/gu.json";
// import paTranslations from "../translations/pa.json";
// import orTranslations from "../translations/or.json";
// import asTranslations from "../translations/as.json";
// import urTranslations from "../translations/ur.json";

export type Language =
  | "en"  // English
  | "hi"  // Hindi
  | "mr"; // Marathi
  // | "bn"  // Bengali
  // | "ta"  // Tamil
  // | "te"  // Telugu
  // | "kn"  // Kannada
  // | "ml"  // Malayalam
  // | "gu"  // Gujarati
  // | "pa"  // Punjabi
  // | "or"  // Odia
  // | "as"  // Assamese
  // | "ur"; // Urdu

type TranslationValue = string | string[] | Record<string, any>;

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => TranslationValue;
  hasSelectedLanguage: boolean;
};

const translations: Record<Language, any> = {
  en: enTranslations,
  hi: hiTranslations,
  mr: mrTranslations,
  // bn: bnTranslations,
  // ta: taTranslations,
  // te: teTranslations,
  // kn: knTranslations,
  // ml: mlTranslations,
  // gu: guTranslations,
  // pa: paTranslations,
  // or: orTranslations,
  // as: asTranslations,
  // ur: urTranslations,
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
    return (savedLanguage as Language) || "hi";
  });
  
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);

  // Update localStorage when language changes
  useEffect(() => {
    localStorage.setItem("language", language);
    setHasSelectedLanguage(true);
  }, [language]);

  const t = (key: string): TranslationValue => {
    const keys = key.split('.');
    // Try selected language first
    let selected: any = translations[language];
    for (const k of keys) {
      if (selected && selected[k] !== undefined) {
        selected = selected[k];
      } else {
        selected = undefined;
        break;
      }
    }
    if (selected !== undefined) return selected;

    // Fallback to English
    let fallback: any = translations.en;
    for (const k of keys) {
      if (fallback && fallback[k] !== undefined) {
        fallback = fallback[k];
      } else {
        fallback = undefined;
        break;
      }
    }
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, hasSelectedLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

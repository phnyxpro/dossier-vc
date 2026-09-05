import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import en from "@/i18n/en.json";
import es from "@/i18n/es.json";
import fr from "@/i18n/fr.json";
import nl from "@/i18n/nl.json";

export type Locale = "en" | "es" | "fr" | "nl";

export const LOCALES: { code: Locale; label: string; name: string }[] = [
  { code: "en", label: "EN", name: "English" },
  { code: "es", label: "ES", name: "Español" },
  { code: "fr", label: "FR", name: "Français" },
  { code: "nl", label: "NL", name: "Nederlands" },
];

const STORAGE_KEY = "dossier_language";

const dictionaries: Record<Locale, Record<string, string>> = { en, es, fr, nl };

interface LanguageCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageCtx>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

function isLocale(value: string | null): value is Locale {
  return !!value && LOCALES.some((l) => l.code === value);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start at "en" so server and client markup match, then hydrate.
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) {
      setLocaleState(stored);
      return;
    }
    const browser = window.navigator.language?.slice(0, 2);
    if (isLocale(browser ?? null)) setLocaleState(browser as Locale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) =>
      dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? fallback ?? key,
    [locale],
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>{children}</LanguageContext.Provider>
  );
}

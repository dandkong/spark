import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import enUS from "./resources/en-US";
import zhCN from "./resources/zh-CN";

export type Locale = "en-US" | "zh-CN";
export type LanguagePreference = "system" | Locale;

type TranslationKey = keyof typeof enUS;
type TranslationParams = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  languagePreference: LanguagePreference;
  t: (key: TranslationKey, params?: TranslationParams) => string;
};

const resources: Record<Locale, Record<TranslationKey, string>> = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  languagePreference,
}: {
  children: ReactNode;
  languagePreference: LanguagePreference;
}) {
  const locale = resolveLocale(languagePreference);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: TranslationKey, params?: TranslationParams) =>
      translateForLocale(locale, key, params);

    return { locale, languagePreference, t };
  }, [languagePreference, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export function translateForLocale(
  locale: Locale,
  key: TranslationKey,
  params?: TranslationParams,
) {
  const template = resources[locale][key] ?? resources["en-US"][key] ?? key;
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, name) =>
    params[name] === undefined ? match : String(params[name]),
  );
}

export function isLanguagePreference(
  value: unknown,
): value is LanguagePreference {
  return value === "system" || value === "en-US" || value === "zh-CN";
}

export function resolveLocale(preference: LanguagePreference): Locale {
  if (preference !== "system") return preference;
  return getSystemLocale();
}

function getSystemLocale(): Locale {
  if (typeof navigator === "undefined") return "en-US";
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

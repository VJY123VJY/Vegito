import { en, type TranslationDictionary } from "./en";
import { mr } from "./mr";
import { hi } from "./hi";

export type Language = "en" | "mr" | "hi";

export const translations: Record<Language, TranslationDictionary> = {
  en,
  mr,
  hi,
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  mr: "मराठी",
  hi: "हिन्दी",
};

export { en, mr, hi };
export type { TranslationDictionary };

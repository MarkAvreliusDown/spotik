export type FontSize = "small" | "medium" | "large";
export type TranslationProvider = "ollama" | "deepl";

export interface UiSettings {
  targetLang: string;
  showTranslation: boolean;
  fontSize: FontSize;
  translationProvider: TranslationProvider;
}

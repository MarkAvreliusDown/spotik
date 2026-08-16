import type { UiSettings } from "./types.js";

const STORAGE_KEY = "spotik:ui-settings";

const DEFAULT_SETTINGS: UiSettings = {
  targetLang: "en",
  showTranslation: true,
  fontSize: "medium",
  translationProvider: "ollama",
};

/** Список ограничен языками, которые типичный self-host LibreTranslate поддерживает из коробки. */
export const AVAILABLE_LANGUAGES: Array<{ code: string; label: string }> = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "tr", label: "Türkçe" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
];

export function loadSettings(): UiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<UiSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: UiSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

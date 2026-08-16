import type { FontSize, TranslationProvider, UiSettings } from "./types.js";

export interface SettingsPanelOptions {
  container: HTMLElement;
  initial: UiSettings;
  languages: Array<{ code: string; label: string }>;
  onChange: (settings: UiSettings) => void;
}

const FONT_SIZE_OPTIONS: Array<{ value: FontSize; label: string }> = [
  { value: "small", label: "Мелкий" },
  { value: "medium", label: "Средний" },
  { value: "large", label: "Крупный" },
];

const PROVIDER_OPTIONS: Array<{ value: TranslationProvider; label: string }> = [
  { value: "ollama", label: "Ollama (локально)" },
  { value: "deepl", label: "DeepL (облако)" },
];

/** Панель настроек UI: язык перевода, показ/скрытие перевода, размер шрифта. Хранит своё состояние и уведомляет через onChange. */
export class SettingsPanel {
  private settings: UiSettings;
  private readonly onChange: (settings: UiSettings) => void;

  constructor(options: SettingsPanelOptions) {
    this.settings = { ...options.initial };
    this.onChange = options.onChange;
    this.render(options.container, options.languages);
  }

  private render(container: HTMLElement, languages: Array<{ code: string; label: string }>): void {
    const langLabel = document.createElement("label");
    langLabel.className = "settings-field";
    const langCaption = document.createElement("span");
    langCaption.textContent = "Язык перевода";
    const langSelect = document.createElement("select");
    for (const lang of languages) {
      const opt = document.createElement("option");
      opt.value = lang.code;
      opt.textContent = lang.label;
      opt.selected = lang.code === this.settings.targetLang;
      langSelect.appendChild(opt);
    }
    langSelect.addEventListener("change", () => {
      this.settings = { ...this.settings, targetLang: langSelect.value };
      this.onChange({ ...this.settings });
    });
    langLabel.append(langCaption, langSelect);

    const showRow = document.createElement("label");
    showRow.className = "settings-toggle-row";
    const showCheckbox = document.createElement("input");
    showCheckbox.type = "checkbox";
    showCheckbox.checked = this.settings.showTranslation;
    showCheckbox.addEventListener("change", () => {
      this.settings = { ...this.settings, showTranslation: showCheckbox.checked };
      this.onChange({ ...this.settings });
    });
    const showCaption = document.createElement("span");
    showCaption.textContent = "Показывать перевод";
    showRow.append(showCaption, showCheckbox);

    const fontLabel = document.createElement("label");
    fontLabel.className = "settings-field";
    const fontCaption = document.createElement("span");
    fontCaption.textContent = "Размер шрифта";
    const fontSelect = document.createElement("select");
    for (const size of FONT_SIZE_OPTIONS) {
      const opt = document.createElement("option");
      opt.value = size.value;
      opt.textContent = size.label;
      opt.selected = size.value === this.settings.fontSize;
      fontSelect.appendChild(opt);
    }
    fontSelect.addEventListener("change", () => {
      this.settings = { ...this.settings, fontSize: fontSelect.value as FontSize };
      this.onChange({ ...this.settings });
    });
    fontLabel.append(fontCaption, fontSelect);

    const providerLabel = document.createElement("label");
    providerLabel.className = "settings-field";
    const providerCaption = document.createElement("span");
    providerCaption.textContent = "Провайдер перевода";
    const providerSelect = document.createElement("select");
    for (const option of PROVIDER_OPTIONS) {
      const opt = document.createElement("option");
      opt.value = option.value;
      opt.textContent = option.label;
      opt.selected = option.value === this.settings.translationProvider;
      providerSelect.appendChild(opt);
    }
    providerLabel.append(providerCaption, providerSelect);

    const deeplKeyRow = document.createElement("div");
    deeplKeyRow.className = "settings-field settings-deepl-key";
    const deeplKeyCaption = document.createElement("span");
    deeplKeyCaption.textContent = "DeepL API-ключ";
    const deeplKeyInput = document.createElement("input");
    deeplKeyInput.type = "password";
    deeplKeyInput.placeholder = "Вставьте ключ";
    const deeplKeySaveBtn = document.createElement("button");
    deeplKeySaveBtn.type = "button";
    deeplKeySaveBtn.textContent = "Сохранить";
    const deeplKeyStatus = document.createElement("span");
    deeplKeyStatus.className = "settings-deepl-key-status";

    const refreshDeeplKeyStatus = (): void => {
      void window.spotikTranslation.hasDeeplApiKey().then((hasKey) => {
        deeplKeyStatus.textContent = hasKey ? "Ключ сохранён" : "Ключ не задан";
      });
    };
    refreshDeeplKeyStatus();

    deeplKeySaveBtn.addEventListener("click", () => {
      const key = deeplKeyInput.value.trim();
      if (!key) return;
      void window.spotikTranslation.setDeeplApiKey(key).then(() => {
        deeplKeyInput.value = "";
        refreshDeeplKeyStatus();
      });
    });

    deeplKeyRow.append(deeplKeyCaption, deeplKeyInput, deeplKeySaveBtn, deeplKeyStatus);

    const updateDeeplKeyRowVisibility = (): void => {
      deeplKeyRow.hidden = this.settings.translationProvider !== "deepl";
    };
    updateDeeplKeyRowVisibility();

    providerSelect.addEventListener("change", () => {
      this.settings = { ...this.settings, translationProvider: providerSelect.value as TranslationProvider };
      updateDeeplKeyRowVisibility();
      this.onChange({ ...this.settings });
    });

    container.append(langLabel, showRow, fontLabel, providerLabel, deeplKeyRow);
  }
}

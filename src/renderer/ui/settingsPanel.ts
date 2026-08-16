import type { FontSize, UiSettings } from "./types.js";

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

    container.append(langLabel, showRow, fontLabel);
  }
}

import type { LyricsLine } from "../lyrics/types.js";
import type { FontSize, UiSettings } from "./types.js";

interface LineRow {
  root: HTMLDivElement;
  translation: HTMLDivElement;
  timeMs: number;
}

const FONT_SIZE_CLASS: Record<FontSize, string> = {
  small: "lyrics-font-small",
  medium: "lyrics-font-medium",
  large: "lyrics-font-large",
};

const AUTOSCROLL_PAUSE_MS = 5000;

/**
 * Рендерит построчный оригинал+перевод, подсвечивает активную строку и
 * скроллит к ней. Ничего не знает про сеть/IPC — только DOM. Перевод
 * приходит не сразу для всего трека, а точечно по индексам (см. main.ts,
 * батчинг вокруг активной строки), поэтому строка рендерится без перевода
 * до готовности и обновляется отдельным вызовом setTranslation.
 */
export class LyricsView {
  private readonly container: HTMLElement;
  private readonly onSeek: (timeMs: number) => void;
  private rows: LineRow[] = [];
  private activeIndex = -1;
  private showTranslation = true;
  private autoscrollPausedUntil = 0;
  private readonly reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(container: HTMLElement, onSeek: (timeMs: number) => void) {
    this.container = container;
    this.onSeek = onSeek;

    // Скролл/колесо мыши от пользователя ставит автоскролл на паузу — иначе он
    // тут же "выдёргивает" вид назад к активной строке при попытке пролистать текст.
    let userScrollTimer: ReturnType<typeof setTimeout> | null = null;
    this.container.addEventListener("wheel", () => {
      this.autoscrollPausedUntil = Date.now() + AUTOSCROLL_PAUSE_MS;
      if (userScrollTimer) clearTimeout(userScrollTimer);
      userScrollTimer = setTimeout(() => (userScrollTimer = null), AUTOSCROLL_PAUSE_MS);
    });
  }

  showMessage(text: string): void {
    this.rows = [];
    this.activeIndex = -1;
    this.container.innerHTML = "";
    const msg = document.createElement("div");
    msg.className = "lyrics-message";
    msg.textContent = text;
    this.container.appendChild(msg);
  }

  setLines(lines: LyricsLine[]): void {
    this.activeIndex = -1;
    this.container.innerHTML = "";
    this.rows = lines.map((line) => {
      const root = document.createElement("div");
      root.className = "lyrics-pair";
      root.tabIndex = 0;
      root.addEventListener("click", () => this.onSeek(line.timeMs));
      root.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.onSeek(line.timeMs);
        }
      });

      const original = document.createElement("div");
      original.className = "lyrics-line-original";
      original.textContent = line.text || "♪";

      const translation = document.createElement("div");
      translation.className = "lyrics-line-translation";
      translation.hidden = !this.showTranslation;

      root.append(original, translation);
      this.container.appendChild(root);
      return { root, translation, timeMs: line.timeMs };
    });
  }

  setTranslation(index: number, text: string): void {
    const row = this.rows[index];
    if (!row) return;
    row.translation.textContent = text;
  }

  setActiveIndex(index: number): void {
    if (index === this.activeIndex) return;
    if (this.activeIndex >= 0 && this.rows[this.activeIndex]) {
      this.rows[this.activeIndex].root.classList.remove("active");
    }
    this.activeIndex = index;
    const row = this.rows[index];
    if (!row) return;
    row.root.classList.add("active");
    if (Date.now() < this.autoscrollPausedUntil) return;
    row.root.scrollIntoView({ behavior: this.reduceMotion ? "auto" : "smooth", block: "center" });
  }

  applySettings(settings: UiSettings): void {
    this.showTranslation = settings.showTranslation;
    for (const row of this.rows) {
      row.translation.hidden = !this.showTranslation;
    }
    for (const cls of Object.values(FONT_SIZE_CLASS)) {
      this.container.classList.remove(cls);
    }
    this.container.classList.add(FONT_SIZE_CLASS[settings.fontSize]);
  }
}

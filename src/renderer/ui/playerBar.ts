import type { PlaybackState } from "../playback/types.js";

const ICON_PREV =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="19,20 9,12 19,4" /><rect x="5" y="4" width="2" height="16" /></svg>';
const ICON_NEXT =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5,4 15,12 5,20" /><rect x="17" y="4" width="2" height="16" /></svg>';
const ICON_PLAY = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="6,4 20,12 6,20" /></svg>';
const ICON_PAUSE =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>';

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export interface PlayerBarOptions {
  container: HTMLElement;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (positionMs: number) => void;
}

/** Плеер-бар: обложка, название/артист, транспорт, прогресс-бар с drag-to-seek. */
export class PlayerBar {
  private readonly container: HTMLElement;
  private readonly onTogglePlay: () => void;
  private readonly onPrev: () => void;
  private readonly onNext: () => void;
  private readonly onSeek: (positionMs: number) => void;

  private coverEl!: HTMLImageElement;
  private titleEl!: HTMLDivElement;
  private artistEl!: HTMLDivElement;
  private playBtn!: HTMLButtonElement;
  private prevBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private currentTimeEl!: HTMLSpanElement;
  private totalTimeEl!: HTMLSpanElement;
  private progressTrackEl!: HTMLDivElement;
  private progressFillEl!: HTMLDivElement;

  private state: PlaybackState | null = null;
  private dragging = false;
  private rafHandle: number | null = null;
  private lastUpdateTs = 0;

  constructor(options: PlayerBarOptions) {
    this.container = options.container;
    this.onTogglePlay = options.onTogglePlay;
    this.onPrev = options.onPrev;
    this.onNext = options.onNext;
    this.onSeek = options.onSeek;
    this.render();
    this.setPlaybackState(null);
    this.tick();
  }

  private render(): void {
    this.container.innerHTML = "";

    const row = document.createElement("div");
    row.className = "player-row";

    this.coverEl = document.createElement("img");
    this.coverEl.className = "player-cover";
    this.coverEl.alt = "";

    const meta = document.createElement("div");
    meta.className = "player-meta";
    this.titleEl = document.createElement("div");
    this.titleEl.className = "player-title";
    this.artistEl = document.createElement("div");
    this.artistEl.className = "player-artist";
    meta.append(this.titleEl, this.artistEl);

    const transport = document.createElement("div");
    transport.className = "player-transport";
    this.prevBtn = document.createElement("button");
    this.prevBtn.type = "button";
    this.prevBtn.className = "transport-btn";
    this.prevBtn.disabled = true;
    this.prevBtn.setAttribute("aria-label", "Предыдущий трек");
    this.prevBtn.innerHTML = ICON_PREV;
    this.prevBtn.addEventListener("click", () => this.onPrev());

    this.playBtn = document.createElement("button");
    this.playBtn.type = "button";
    this.playBtn.className = "transport-btn transport-play";
    this.playBtn.disabled = true;
    this.playBtn.setAttribute("aria-label", "Пауза/воспроизведение");
    this.playBtn.innerHTML = ICON_PLAY;
    this.playBtn.addEventListener("click", () => this.onTogglePlay());

    this.nextBtn = document.createElement("button");
    this.nextBtn.type = "button";
    this.nextBtn.className = "transport-btn";
    this.nextBtn.disabled = true;
    this.nextBtn.setAttribute("aria-label", "Следующий трек");
    this.nextBtn.innerHTML = ICON_NEXT;
    this.nextBtn.addEventListener("click", () => this.onNext());

    transport.append(this.prevBtn, this.playBtn, this.nextBtn);
    row.append(this.coverEl, meta, transport);

    const progressRow = document.createElement("div");
    progressRow.className = "player-progress-row";

    this.currentTimeEl = document.createElement("span");
    this.currentTimeEl.className = "player-time";
    this.currentTimeEl.textContent = "0:00";

    this.progressTrackEl = document.createElement("div");
    this.progressTrackEl.className = "progress-track";
    const trackBg = document.createElement("div");
    trackBg.className = "progress-track-bg";
    this.progressFillEl = document.createElement("div");
    this.progressFillEl.className = "progress-fill";
    const handle = document.createElement("div");
    handle.className = "progress-handle";
    trackBg.append(this.progressFillEl, handle);
    this.progressTrackEl.append(trackBg);
    this.attachDrag();

    this.totalTimeEl = document.createElement("span");
    this.totalTimeEl.className = "player-time player-time-total";
    this.totalTimeEl.textContent = "0:00";

    progressRow.append(this.currentTimeEl, this.progressTrackEl, this.totalTimeEl);

    this.container.append(row, progressRow);
  }

  private attachDrag(): void {
    const ratioFromEvent = (event: PointerEvent): number => {
      const rect = this.progressTrackEl.getBoundingClientRect();
      return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    };

    this.progressTrackEl.addEventListener("pointerdown", (event) => {
      if (!this.state || this.state.durationMs <= 0) return;
      this.dragging = true;
      this.progressTrackEl.classList.add("dragging");
      this.progressTrackEl.setPointerCapture(event.pointerId);
      this.setFillRatio(ratioFromEvent(event));
    });

    this.progressTrackEl.addEventListener("pointermove", (event) => {
      if (!this.dragging) return;
      this.setFillRatio(ratioFromEvent(event));
    });

    const endDrag = (event: PointerEvent) => {
      if (!this.dragging || !this.state) return;
      this.dragging = false;
      this.progressTrackEl.classList.remove("dragging");
      const ratio = ratioFromEvent(event);
      this.onSeek(ratio * this.state.durationMs);
    };

    this.progressTrackEl.addEventListener("pointerup", endDrag);
    this.progressTrackEl.addEventListener("pointercancel", endDrag);
  }

  private setFillRatio(ratio: number): void {
    this.progressFillEl.style.width = `${ratio * 100}%`;
    if (this.state) this.currentTimeEl.textContent = formatTime(ratio * this.state.durationMs);
  }

  setPlaybackState(state: PlaybackState | null): void {
    this.state = state;
    this.lastUpdateTs = performance.now();

    if (!state) {
      this.titleEl.textContent = "Ничего не играет";
      this.artistEl.textContent = "";
      this.coverEl.removeAttribute("src");
      this.playBtn.innerHTML = ICON_PLAY;
      this.setEnabled(false);
      this.setFillRatio(0);
      this.totalTimeEl.textContent = "0:00";
      return;
    }

    this.titleEl.textContent = state.title || "Без названия";
    this.artistEl.textContent = state.artist;
    if (state.albumImageUrl) this.coverEl.src = state.albumImageUrl;
    else this.coverEl.removeAttribute("src");
    this.playBtn.innerHTML = state.isPlaying ? ICON_PAUSE : ICON_PLAY;
    this.setEnabled(true);
    this.totalTimeEl.textContent = formatTime(state.durationMs);
    if (!this.dragging) {
      const ratio = state.durationMs > 0 ? state.positionMs / state.durationMs : 0;
      this.setFillRatio(ratio);
    }
  }

  private setEnabled(enabled: boolean): void {
    this.prevBtn.disabled = !enabled;
    this.playBtn.disabled = !enabled;
    this.nextBtn.disabled = !enabled;
  }

  private tick = (): void => {
    if (this.state && this.state.isPlaying && !this.dragging) {
      const elapsed = performance.now() - this.lastUpdateTs;
      const position = Math.min(this.state.positionMs + elapsed, this.state.durationMs);
      const ratio = this.state.durationMs > 0 ? position / this.state.durationMs : 0;
      this.progressFillEl.style.width = `${ratio * 100}%`;
      this.currentTimeEl.textContent = formatTime(position);
    }
    this.rafHandle = requestAnimationFrame(this.tick);
  };

  destroy(): void {
    if (this.rafHandle !== null) cancelAnimationFrame(this.rafHandle);
  }
}

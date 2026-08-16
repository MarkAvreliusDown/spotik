import type { LyricsLine } from "../lyrics/types.js";
import type { PlaybackState } from "../playback/types.js";
import type { SyncLineChange } from "./types.js";

const TICK_MS = 200;

/**
 * Индекс последней строки, чей timeMs <= positionMs (бинарный поиск).
 * -1, если позиция раньше первой строки.
 */
export function findActiveLineIndex(lines: LyricsLine[], positionMs: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (lines[mid].timeMs <= positionMs) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

/**
 * Держит индекс активной строки лирики синхронным с позицией плеера.
 * PlaybackPoller обновляет positionMs раз в 2 сек (см. player.ts) — это
 * слишком редко для плавной подсветки строки, поэтому между обновлениями
 * позиция локально интерполируется по реальному времени (тик каждые
 * TICK_MS), а не берётся "застывшей" до следующего опроса. Резкий скачок
 * позиции (перемотка) обнаруживается сравнением с интерполированным
 * значением и применяется сразу, без сглаживания.
 */
export class SyncEngine extends EventTarget {
  private lines: LyricsLine[] = [];
  private activeIndex = -1;
  private lastPositionMs = 0;
  private lastDurationMs = 0;
  private lastUpdateTs = 0;
  private isPlaying = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  setLines(lines: LyricsLine[]): void {
    this.lines = lines;
    this.activeIndex = -1;
    this.emitIfChanged(findActiveLineIndex(this.lines, this.lastPositionMs));
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setPlaybackState(state: PlaybackState): void {
    this.lastPositionMs = state.positionMs;
    this.lastDurationMs = state.durationMs;
    this.lastUpdateTs = performance.now();
    this.isPlaying = state.isPlaying;
    this.tick();
  }

  /** Следующие `count` строк после текущей активной — для предзагрузки перевода. */
  getUpcomingLines(count: number): LyricsLine[] {
    const start = this.activeIndex + 1;
    return this.lines.slice(start, start + count);
  }

  getActiveIndex(): number {
    return this.activeIndex;
  }

  private interpolatedPositionMs(): number {
    if (!this.isPlaying) return this.lastPositionMs;
    const elapsed = performance.now() - this.lastUpdateTs;
    const position = this.lastPositionMs + elapsed;
    return this.lastDurationMs > 0 ? Math.min(position, this.lastDurationMs) : position;
  }

  private tick(): void {
    if (this.lines.length === 0) return;
    const index = findActiveLineIndex(this.lines, this.interpolatedPositionMs());
    this.emitIfChanged(index);
  }

  private emitIfChanged(index: number): void {
    if (index === this.activeIndex) return;
    this.activeIndex = index;
    const line = index >= 0 ? this.lines[index] : null;
    this.dispatchEvent(new CustomEvent<SyncLineChange>("line-changed", { detail: { index, line } }));
  }
}

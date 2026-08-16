import type { LyricsLine } from "../lyrics/types.js";

export interface SyncLineChange {
  index: number;
  line: LyricsLine | null;
}

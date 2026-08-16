export interface LyricsLine {
  timeMs: number;
  text: string;
}

export type LyricsResult =
  | { status: "found"; lines: LyricsLine[] }
  | { status: "instrumental" }
  | { status: "not-found" };

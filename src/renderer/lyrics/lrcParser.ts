import type { LyricsLine } from "./types.js";

const TAG_RE = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

/**
 * Парсит текст LRC в массив строк с таймкодами. Строки без тега времени
 * (метаданные вида [ar:...], [ti:...] и т.п.) отбрасываются. Одна строка
 * текста может нести несколько тегов времени — LRC-конвенция для повторов,
 * каждый тег даёт отдельный элемент результата.
 */
export function parseLrc(lrc: string): LyricsLine[] {
  const lines: LyricsLine[] = [];

  for (const rawLine of lrc.split(/\r?\n/)) {
    const tags: number[] = [];
    let match: RegExpExecArray | null;
    TAG_RE.lastIndex = 0;
    while ((match = TAG_RE.exec(rawLine)) !== null) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = match[3] ?? "0";
      const fractionMs = Number(fraction.padEnd(3, "0").slice(0, 3));
      tags.push(minutes * 60_000 + seconds * 1000 + fractionMs);
    }
    if (tags.length === 0) continue;

    const text = rawLine.replace(TAG_RE, "").trim();
    for (const timeMs of tags) {
      lines.push({ timeMs, text });
    }
  }

  lines.sort((a, b) => a.timeMs - b.timeMs);
  return lines;
}

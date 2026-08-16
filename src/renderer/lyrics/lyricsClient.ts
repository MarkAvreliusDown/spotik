import { parseLrc } from "./lrcParser.js";
import type { LyricsResult } from "./types.js";

const SEARCH_URL = "https://lrclib.net/api/search";
const DURATION_TOLERANCE_SEC = 2;

interface LrcLibSearchResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

function pickBestMatch(
  results: LrcLibSearchResult[],
  durationSec: number,
): LrcLibSearchResult | null {
  const withinTolerance = results.filter(
    (r) => Math.abs(r.duration - durationSec) <= DURATION_TOLERANCE_SEC,
  );
  if (withinTolerance.length === 0) return null;

  // Синхронизированный текст приоритетнее, дальше — чем ближе duration, тем лучше.
  withinTolerance.sort((a, b) => {
    const syncedDiff = Number(b.syncedLyrics !== null) - Number(a.syncedLyrics !== null);
    if (syncedDiff !== 0) return syncedDiff;
    return Math.abs(a.duration - durationSec) - Math.abs(b.duration - durationSec);
  });
  return withinTolerance[0];
}

/**
 * Ищет текст трека на lrclib.net по (artist, title, duration). lrclib не
 * поддерживает допуск по длительности на своём /api/search — фильтрация
 * по ±2 сек делается на клиенте среди возвращённых кандидатов.
 */
export async function fetchLyrics(
  artist: string,
  title: string,
  durationMs: number,
): Promise<LyricsResult> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("track_name", title);
  url.searchParams.set("artist_name", artist);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`lrclib.net вернул ${res.status}`);
  }

  const results = (await res.json()) as LrcLibSearchResult[];
  const durationSec = durationMs / 1000;
  const best = pickBestMatch(results, durationSec);
  if (!best) return { status: "not-found" };
  if (best.instrumental) return { status: "instrumental" };
  if (!best.syncedLyrics) return { status: "not-found" };

  const lines = parseLrc(best.syncedLyrics);
  if (lines.length === 0) return { status: "not-found" };
  return { status: "found", lines };
}

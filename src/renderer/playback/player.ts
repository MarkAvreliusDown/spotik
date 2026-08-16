import type { PlaybackState } from "./types.js";
import * as webApi from "./webApi.js";
import type { RawPlaybackResponse } from "./webApi.js";

const POLL_INTERVAL_MS = 2000;

function pickAlbumImage(images: { url: string; width: number; height: number }[] | undefined): string | null {
  if (!images || images.length === 0) return null;
  // Spotify отдаёт изображения от большего к меньшему — берём наименьшее, которого хватает под 56px обложку.
  const sorted = [...images].sort((a, b) => a.width - b.width);
  return sorted.find((img) => img.width >= 112)?.url ?? sorted[sorted.length - 1].url;
}

function toPlaybackState(raw: RawPlaybackResponse): PlaybackState {
  const item = raw.item;
  return {
    trackId: item?.id ?? "",
    artist: item?.artists.map((a) => a.name).join(", ") ?? "",
    title: item?.name ?? "",
    durationMs: item?.duration_ms ?? 0,
    positionMs: raw.progress_ms ?? 0,
    isPlaying: raw.is_playing,
    albumImageUrl: pickAlbumImage(item?.album.images),
  };
}

/**
 * Опрашивает GET /me/player, т.к. Spotify Web Playback SDK не работает в
 * Electron без Widevine CDM (не входит в стандартную сборку) — звук играет
 * на уже активном Connect-устройстве пользователя, Spotik только отражает
 * состояние и шлёт команды управления.
 */
export class PlaybackPoller extends EventTarget {
  private timer: ReturnType<typeof setInterval> | null = null;
  private hasTrack = false;

  start(): void {
    if (this.timer) return;
    void this.poll();
    this.timer = setInterval(() => void this.poll(), POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.hasTrack = false;
  }

  async togglePlay(isCurrentlyPlaying: boolean): Promise<void> {
    const token = await window.spotikAuth.getAccessToken();
    if (!token) return;
    if (isCurrentlyPlaying) await webApi.pause(token);
    else await webApi.play(token);
    void this.poll();
  }

  async nextTrack(): Promise<void> {
    const token = await window.spotikAuth.getAccessToken();
    if (!token) return;
    await webApi.skipToNext(token);
    void this.poll();
  }

  async previousTrack(): Promise<void> {
    const token = await window.spotikAuth.getAccessToken();
    if (!token) return;
    await webApi.skipToPrevious(token);
    void this.poll();
  }

  async seek(positionMs: number): Promise<void> {
    const token = await window.spotikAuth.getAccessToken();
    if (!token) return;
    await webApi.seek(token, positionMs);
    void this.poll();
  }

  private async poll(): Promise<void> {
    const token = await window.spotikAuth.getAccessToken();
    if (!token) return;
    try {
      const raw = await webApi.getCurrentPlayback(token);
      if (!raw || !raw.item) {
        if (this.hasTrack) {
          this.hasTrack = false;
          this.dispatchEvent(new CustomEvent("nothing-playing"));
        }
        return;
      }
      this.hasTrack = true;
      this.dispatchEvent(
        new CustomEvent<PlaybackState>("state-changed", { detail: toPlaybackState(raw) }),
      );
    } catch (err) {
      this.dispatchEvent(new CustomEvent("error", { detail: { message: String(err) } }));
    }
  }
}

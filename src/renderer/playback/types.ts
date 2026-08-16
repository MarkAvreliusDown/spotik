export interface PlaybackState {
  trackId: string;
  artist: string;
  title: string;
  durationMs: number;
  positionMs: number;
  isPlaying: boolean;
  albumImageUrl: string | null;
}

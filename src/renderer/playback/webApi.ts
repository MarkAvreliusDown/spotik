const WEB_API_BASE = "https://api.spotify.com/v1";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export interface RawPlaybackResponse {
  is_playing: boolean;
  progress_ms: number | null;
  item: {
    id: string;
    name: string;
    duration_ms: number;
    artists: { name: string }[];
    album: { images: { url: string; width: number; height: number }[] };
  } | null;
}

export async function getCurrentPlayback(accessToken: string): Promise<RawPlaybackResponse | null> {
  const res = await fetch(`${WEB_API_BASE}/me/player`, { headers: authHeaders(accessToken) });
  if (res.status === 204) return null;
  if (!res.ok) {
    throw new Error(`getCurrentPlayback failed: ${res.status}`);
  }
  return (await res.json()) as RawPlaybackResponse;
}

export async function play(accessToken: string): Promise<void> {
  await fetch(`${WEB_API_BASE}/me/player/play`, { method: "PUT", headers: authHeaders(accessToken) });
}

export async function pause(accessToken: string): Promise<void> {
  await fetch(`${WEB_API_BASE}/me/player/pause`, { method: "PUT", headers: authHeaders(accessToken) });
}

export async function skipToNext(accessToken: string): Promise<void> {
  await fetch(`${WEB_API_BASE}/me/player/next`, { method: "POST", headers: authHeaders(accessToken) });
}

export async function skipToPrevious(accessToken: string): Promise<void> {
  await fetch(`${WEB_API_BASE}/me/player/previous`, { method: "POST", headers: authHeaders(accessToken) });
}

export async function seek(accessToken: string, positionMs: number): Promise<void> {
  await fetch(`${WEB_API_BASE}/me/player/seek?position_ms=${Math.round(positionMs)}`, {
    method: "PUT",
    headers: authHeaders(accessToken),
  });
}

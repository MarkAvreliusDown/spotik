import { AuthConfig } from "./config";
import { AuthError, TokenResponse } from "./types";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (response.status === 400 && text.includes("invalid_grant")) {
      throw new AuthError("SESSION_EXPIRED", "Refresh token отозван или истёк");
    }
    throw new AuthError("LOGIN_FAILED", `Spotify token endpoint вернул ${response.status}: ${text}`);
  }

  return (await response.json()) as TokenResponse;
}

export function exchangeCodeForToken(
  config: AuthConfig,
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: codeVerifier,
  });
  return postToken(body);
}

export function refreshAccessToken(config: AuthConfig, refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
  });
  return postToken(body);
}

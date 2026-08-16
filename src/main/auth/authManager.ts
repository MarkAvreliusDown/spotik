import { BrowserWindow } from "electron";
import { getAuthConfig } from "./config";
import { generateCodeVerifier, codeChallengeFromVerifier, generateState } from "./pkce";
import { waitForCallback } from "./callbackServer";
import { exchangeCodeForToken, refreshAccessToken } from "./spotifyApi";
import * as tokenStore from "./tokenStore";
import { SPOTIFY_SCOPE_STRING } from "./scopes";
import { AuthError, AuthStatus } from "./types";

const REFRESH_SAFETY_BUFFER_MS = 60_000;

interface InMemoryToken {
  accessToken: string;
  expiresAt: number;
}

let inMemoryToken: InMemoryToken | null = null;
let loggedInHint = false;
let statusListeners: Array<(status: AuthStatus) => void> = [];

export function onStatusChanged(listener: (status: AuthStatus) => void): () => void {
  statusListeners.push(listener);
  return () => {
    statusListeners = statusListeners.filter((l) => l !== listener);
  };
}

function emitStatus(status: AuthStatus) {
  loggedInHint = status.loggedIn;
  for (const listener of statusListeners) listener(status);
}

export async function initFromDisk(): Promise<AuthStatus> {
  const refreshToken = await tokenStore.getRefreshToken();
  loggedInHint = Boolean(refreshToken);
  return { loggedIn: loggedInHint };
}

export function getStatus(): AuthStatus {
  return { loggedIn: loggedInHint };
}

export async function login(): Promise<{ ok: boolean; error?: string }> {
  const config = getAuthConfig();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = codeChallengeFromVerifier(codeVerifier);
  const state = generateState();

  const { promise: callbackPromise, cancel } = waitForCallback(config, state);

  const authorizeUrl = new URL("https://accounts.spotify.com/authorize");
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("scope", SPOTIFY_SCOPE_STRING);

  const authWindow = new BrowserWindow({
    width: 480,
    height: 720,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  authWindow.on("closed", () => cancel());
  authWindow.loadURL(authorizeUrl.toString());

  try {
    const { code } = await callbackPromise;
    const tokens = await exchangeCodeForToken(config, code, codeVerifier);

    inMemoryToken = {
      accessToken: tokens.access_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
    if (tokens.refresh_token) {
      await tokenStore.setRefreshToken(tokens.refresh_token);
    }

    emitStatus({ loggedIn: true });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  } finally {
    if (!authWindow.isDestroyed()) authWindow.close();
  }
}

export async function logout(): Promise<void> {
  inMemoryToken = null;
  await tokenStore.clearRefreshToken();
  emitStatus({ loggedIn: false });
}

export async function getAccessToken(): Promise<string | null> {
  const config = getAuthConfig();

  if (inMemoryToken && Date.now() < inMemoryToken.expiresAt - REFRESH_SAFETY_BUFFER_MS) {
    return inMemoryToken.accessToken;
  }

  const refreshToken = await tokenStore.getRefreshToken();
  if (!refreshToken) {
    emitStatus({ loggedIn: false });
    return null;
  }

  try {
    const tokens = await refreshAccessToken(config, refreshToken);
    inMemoryToken = {
      accessToken: tokens.access_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
    if (tokens.refresh_token) {
      await tokenStore.setRefreshToken(tokens.refresh_token);
    }
    emitStatus({ loggedIn: true });
    return inMemoryToken.accessToken;
  } catch (err) {
    if (err instanceof AuthError && err.code === "SESSION_EXPIRED") {
      inMemoryToken = null;
      await tokenStore.clearRefreshToken();
      emitStatus({ loggedIn: false });
      return null;
    }
    throw err;
  }
}

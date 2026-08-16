export interface AuthConfig {
  clientId: string;
  redirectUri: string;
  callbackPort: number;
  callbackPath: string;
}

function loadAuthConfig(): AuthConfig {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error(
      "SPOTIFY_CLIENT_ID и SPOTIFY_REDIRECT_URI не заданы. " +
        "Зарегистрируйте приложение на https://developer.spotify.com/dashboard, " +
        "укажите Redirect URI, совпадающий с SPOTIFY_REDIRECT_URI, и заполните .env " +
        "(см. .env.example)."
    );
  }

  const url = new URL(redirectUri);
  const port = Number(url.port);
  if (!port) {
    throw new Error(`SPOTIFY_REDIRECT_URI должен содержать явный порт (получено: ${redirectUri})`);
  }

  return {
    clientId,
    redirectUri,
    callbackPort: port,
    callbackPath: url.pathname,
  };
}

let cached: AuthConfig | null = null;

export function getAuthConfig(): AuthConfig {
  if (!cached) {
    cached = loadAuthConfig();
  }
  return cached;
}

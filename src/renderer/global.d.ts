interface AuthStatus {
  loggedIn: boolean;
}

interface SpotikAuthApi {
  login(): Promise<{ ok: boolean; error?: string }>;
  logout(): Promise<void>;
  getAccessToken(): Promise<string | null>;
  getStatus(): Promise<AuthStatus>;
  onStatusChanged(cb: (status: AuthStatus) => void): () => void;
}

interface SpotikTranslationApi {
  translateBatch(lines: string[], targetLang: string): Promise<string[]>;
}

interface SpotikWindowApi {
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  close(): Promise<void>;
  isMaximized(): Promise<boolean>;
  onMaximizeChanged(cb: (isMaximized: boolean) => void): () => void;
}

interface Window {
  spotikAuth: SpotikAuthApi;
  spotikTranslation: SpotikTranslationApi;
  spotikWindow: SpotikWindowApi;
}

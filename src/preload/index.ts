import { contextBridge, ipcRenderer } from "electron";

export interface AuthStatus {
  loggedIn: boolean;
}

const spotikAuth = {
  login: (): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke("auth:login"),
  logout: (): Promise<void> => ipcRenderer.invoke("auth:logout"),
  getAccessToken: (): Promise<string | null> => ipcRenderer.invoke("auth:get-access-token"),
  getStatus: (): Promise<AuthStatus> => ipcRenderer.invoke("auth:get-status"),
  onStatusChanged: (cb: (status: AuthStatus) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: AuthStatus) => cb(status);
    ipcRenderer.on("auth:status-changed", listener);
    return () => ipcRenderer.removeListener("auth:status-changed", listener);
  },
};

contextBridge.exposeInMainWorld("spotikAuth", spotikAuth);

export interface YandexCredentials {
  apiKey: string;
  folderId: string;
}

const spotikTranslation = {
  translateBatch: (lines: string[], targetLang: string, provider: "ollama" | "deepl" | "yandex"): Promise<string[]> =>
    ipcRenderer.invoke("translate:batch", lines, targetLang, provider),
  setDeeplApiKey: (key: string): Promise<void> => ipcRenderer.invoke("translation:setDeeplApiKey", key),
  hasDeeplApiKey: (): Promise<boolean> => ipcRenderer.invoke("translation:hasDeeplApiKey"),
  setYandexCredentials: (creds: YandexCredentials): Promise<void> =>
    ipcRenderer.invoke("translation:setYandexCredentials", creds),
  hasYandexCredentials: (): Promise<boolean> => ipcRenderer.invoke("translation:hasYandexCredentials"),
};

contextBridge.exposeInMainWorld("spotikTranslation", spotikTranslation);

const spotikWindow = {
  minimize: (): Promise<void> => ipcRenderer.invoke("window:minimize"),
  maximize: (): Promise<void> => ipcRenderer.invoke("window:maximize"),
  close: (): Promise<void> => ipcRenderer.invoke("window:close"),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke("window:is-maximized"),
  onMaximizeChanged: (cb: (isMaximized: boolean) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => cb(isMaximized);
    ipcRenderer.on("window:maximize-changed", listener);
    ipcRenderer.send("window:subscribe");
    return () => ipcRenderer.removeListener("window:maximize-changed", listener);
  },
};

contextBridge.exposeInMainWorld("spotikWindow", spotikWindow);

export type SpotikAuthApi = typeof spotikAuth;
export type SpotikTranslationApi = typeof spotikTranslation;
export type SpotikWindowApi = typeof spotikWindow;

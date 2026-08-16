import { ipcMain } from "electron";
import { translateBatch, type TranslationProvider } from "./queue";
import { getDeeplApiKey, setDeeplApiKey } from "./deeplKeyStore";

export function registerTranslationIpc(): void {
  ipcMain.handle("translate:batch", (_event, lines: string[], targetLang: string, provider: TranslationProvider) =>
    translateBatch(lines, targetLang, provider),
  );

  ipcMain.handle("translation:setDeeplApiKey", (_event, key: string) => setDeeplApiKey(key));

  ipcMain.handle("translation:hasDeeplApiKey", async () => (await getDeeplApiKey()) !== null);
}

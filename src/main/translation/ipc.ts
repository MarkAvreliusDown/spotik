import { ipcMain } from "electron";
import { translateBatch } from "./queue";

export function registerTranslationIpc(): void {
  ipcMain.handle("translate:batch", (_event, lines: string[], targetLang: string) =>
    translateBatch(lines, targetLang),
  );
}

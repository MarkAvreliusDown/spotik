import { ipcMain, BrowserWindow } from "electron";
import * as authManager from "./authManager";

export function registerAuthIpc(getWindows: () => BrowserWindow[]): void {
  ipcMain.handle("auth:login", () => authManager.login());
  ipcMain.handle("auth:logout", () => authManager.logout());
  ipcMain.handle("auth:get-access-token", () => authManager.getAccessToken());
  ipcMain.handle("auth:get-status", () => authManager.getStatus());

  authManager.onStatusChanged((status) => {
    for (const win of getWindows()) {
      if (!win.isDestroyed()) win.webContents.send("auth:status-changed", status);
    }
  });
}

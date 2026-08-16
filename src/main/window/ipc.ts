import { ipcMain, BrowserWindow } from "electron";

export function registerWindowIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle("window:minimize", () => getWindow()?.minimize());
  ipcMain.handle("window:maximize", () => {
    const win = getWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.handle("window:close", () => getWindow()?.close());
  ipcMain.handle("window:is-maximized", () => getWindow()?.isMaximized() ?? false);

  ipcMain.on("window:subscribe", (event) => {
    const win = getWindow();
    if (!win) return;
    const notify = () => event.sender.send("window:maximize-changed", win.isMaximized());
    win.on("maximize", notify);
    win.on("unmaximize", notify);
  });
}

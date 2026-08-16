import "./env";
import { app, BrowserWindow, Menu } from "electron";
import path from "node:path";
import * as authManager from "./auth/authManager";
import { registerAuthIpc } from "./auth/ipc";
import { registerTranslationIpc } from "./translation/ipc";
import { registerWindowIpc } from "./window/ipc";

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 420,
    minHeight: 600,
    backgroundColor: "#0d0d0f",
    frame: false,
    icon: path.join(__dirname, "../assets/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.loadFile(path.join(__dirname, "../renderer/index.html"));

  // Menu.setApplicationMenu(null) убирает и стандартный accelerator Ctrl+Shift+I —
  // перехватываем комбинацию напрямую, иначе DevTools в frameless-окне не открыть.
  win.webContents.on("before-input-event", (_event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === "i") {
      win.webContents.toggleDevTools();
    }
  });

  return win;
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  registerAuthIpc(() => (mainWindow ? [mainWindow] : []));
  registerTranslationIpc();
  registerWindowIpc(() => mainWindow);
  await authManager.initFromDisk();

  mainWindow = createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

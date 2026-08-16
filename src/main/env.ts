import { app } from "electron";
import path from "node:path";
import dotenv from "dotenv";

/**
 * В dev-режиме .env лежит в корне проекта (process.cwd()). В собранном exe
 * process.cwd() не привязан к папке установки (зависит от того, откуда
 * запущен ярлык). Portable-target electron-builder вдобавок распаковывает
 * себя во временную папку и запускается оттуда — app.getPath("exe") там
 * указывает на %TEMP%\...\Spotik.exe, а не на исходный exe рядом с .env.
 * Для portable electron-builder сам выставляет PORTABLE_EXECUTABLE_DIR —
 * путь к папке с исходным exe, его и используем в первую очередь.
 */
const envPath = process.env.PORTABLE_EXECUTABLE_DIR
  ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, ".env")
  : app.isPackaged
    ? path.join(path.dirname(app.getPath("exe")), ".env")
    : path.resolve(process.cwd(), ".env");

dotenv.config({ path: envPath });

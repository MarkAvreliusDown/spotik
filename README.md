# Spotik — Spotify Lyrics Translator

Десктоп-клиент поверх Spotify: воспроизведение через Web Playback SDK и построчный
перевод лирики под каждой строкой оригинала.

Требуется **Spotify Premium** (Web Playback SDK не работает с бесплатным аккаунтом).

## Возможности

- Управление воспроизведением прямо из приложения (play/pause/next/prev/seek)
- Синхронизированная лирика (lrclib.net) с автоскроллом к активной строке
- Построчный перевод на выбранный язык через локальный [Ollama](https://ollama.com) —
  без внешних API, ключей и лимитов
- Кэш переводов в SQLite — повторный перевод той же строки не бьёт по модели

## Установка и запуск (разработка)

Предварительно:

1. [Node.js](https://nodejs.org/) 20+
2. [Ollama](https://ollama.com), запущенный локально, с загруженной моделью:
   ```
   ollama pull qwen2.5:7b
   ```
3. Приложение на [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   с Redirect URI, совпадающим с `SPOTIFY_REDIRECT_URI` (по умолчанию
   `http://127.0.0.1:43812/callback`)

Далее:

```
npm install
cp .env.example .env   # заполнить SPOTIFY_CLIENT_ID своим значением
npm start
```

## Сборка exe

```
npm run dist
```

Соберёт NSIS-инсталлятор и portable-exe в `release/`. Готовые сборки для Windows
также можно скачать со страницы [Releases](../../releases).

Рядом с exe (или с исходным exe для portable-версии) должен лежать файл `.env` —
без него приложение не сможет авторизоваться в Spotify.

## Стек

Electron + TypeScript, Spotify Web Playback SDK + Web API, lrclib.net, локальный
Ollama для перевода, SQLite (better-sqlite3) для кэша переводов.

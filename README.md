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
   ollama pull gemma2:9b
   ```
3. `SPOTIFY_CLIENT_ID` и `SPOTIFY_REDIRECT_URI` — см. ниже

### Получение SPOTIFY_CLIENT_ID и SPOTIFY_REDIRECT_URI

Приложение авторизуется в Spotify от имени собственного клиента (OAuth PKCE), поэтому
каждому, кто его запускает, нужно зарегистрировать свой собственный "app" в Spotify —
это бесплатно и занимает пару минут.

1. Откройте [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) и
   войдите под своим Spotify-аккаунтом (нужен тот же Premium-аккаунт, под которым будете
   пользоваться приложением).
2. Нажмите **Create app**.
3. Заполните форму:
   - **App name** / **App description** — что угодно, например `Spotik` /
     `Personal lyrics translator client`.
   - **Redirect URI** — впишите `http://127.0.0.1:43812/callback` и нажмите **Add**.
     Это и есть значение для `SPOTIFY_REDIRECT_URI` — оно должно **дословно совпадать**
     с тем, что указано в `.env` (протокол, хост, порт, путь), иначе Spotify откажет в
     авторизации с ошибкой `INVALID_CLIENT: Invalid redirect URI`. Менять порт `43812`
     не нужно, если только он не занят другим приложением на вашей машине — тогда
     впишите сюда и в `.env` один и тот же свободный порт.
   - Внизу отметьте галочку **Web API** (используется для управления воспроизведением и
     получения профиля/треков) и, поставив согласие с условиями использования, нажмите
     **Save**.
4. Откроется страница созданного app — на ней сразу виден **Client ID**. Это значение
   для `SPOTIFY_CLIENT_ID`. Скопируйте его как есть, без пробелов (client secret не
   нужен — PKCE-флоу его не использует, в клиентском приложении хранить секрет было бы
   небезопасно).
5. Впишите оба значения в `.env` (см. ниже):
   ```
   SPOTIFY_CLIENT_ID=<Client ID из шага 4>
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:43812/callback
   ```

Если позже поменяете `SPOTIFY_REDIRECT_URI` в `.env`, не забудьте продублировать
изменение в **Settings** созданного app на Dashboard (**Edit** → Redirect URIs) — иначе
авторизация будет падать с той же ошибкой `INVALID_CLIENT`.

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

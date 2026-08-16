# Spotify Lyrics Translator — Desktop Client

Свой десктоп-клиент поверх Spotify: воспроизведение через Web Playback SDK,
построчный перевод лирики под каждой строкой оригинала.

## Стек

- **Electron** (main + preload + renderer, contextIsolation: true)
- **TypeScript**
- **Spotify Web Playback SDK** — грузится в renderer через `<script>` (SDK требует
  браузерный EME-контекст, в Electron это работает штатно). Требует Spotify Premium.
- **Spotify Web API** — метаданные трека, поиск, плейлисты, управление Connect-устройствами
- **Источник лирики: lrclib.net** (бесплатный, легальный, открытый API с синхронизированными
  LRC-текстами по artist/title/duration) — вместо недокументированного Spotify-эндпоинта.
  Это принципиальное решение: скрейпинг внутреннего lyrics-API Spotify требует sp_dc cookie
  и прямо нарушает ToS + технически хрупко (токен протухает). lrclib не даёт текст 100% треков,
  но легален и стабилен. Можно оставить эндпоинт Spotify как fallback второй очереди —
  на усмотрение, но по умолчанию не делаем.
- **Перевод**: локальный Ollama (`src/main/translation/ollamaClient.ts`, модель по умолчанию
  gemma2:9b — изначально была qwen2.5:7b, но она периодически "соскальзывает" в китайский
  посреди строки на сленге/идиомах, см. компенсирующую логику в `ollamaClient.ts`) — не
  внешний API. Изначально планировался LibreTranslate, но публичные инстансы
  без ключа на практике оказались недоступны (консолидировались вокруг платного
  portal.libretranslate.com), а self-host требовал Docker, которого не было под рукой. У
  пользователя уже стоит и запущен Ollama — переключились на него: бесплатно, офлайн, без
  ключей и лимитов. Каждая строка переводится отдельным запросом `/api/generate`
  (`stream: false`), батч из нескольких строк идёт параллельно через `Promise.all` — локальные
  модели ненадёжно держат порядок/количество строк при просьбе перевести JSON-массив одним
  вызовом, попытка не оправдалась на тесте.
- **Хранилище**: SQLite (better-sqlite3) — кэш переводов по (lyrics_hash, line_index, target_lang)

## Архитектура (поток данных)

```
Electron Main Process
 ├─ auth window (OAuth PKCE) → хранит access/refresh token (keytar / OS keychain)
 ├─ IPC bridge (preload, contextBridge) — единственный канал renderer ↔ main
 └─ Renderer
     ├─ Playback module (Web Playback SDK) — стрим, play/pause/seek, текущая позиция (ms)
     ├─ Now Playing poller — track_id, artist, title, duration
     ├─ Lyrics module — по track_id тянет LRC из lrclib.net, парсит [mm:ss.xx] построчно
     ├─ Sync engine — на каждый tick playback-позиции определяет активную строку
     ├─ Translation module — построчно переводит (с кэшем в SQLite), не блокируя UI
     └─ UI — рендерит оригинал + перевод под каждой строкой, автоскролл к активной строке
```

## Суб-агенты для Claude Code (`.claude/agents/`)

Каждый агент — отдельная зона ответственности, чтобы параллелить работу и не размывать контекст.

### 1. `auth-agent`
- **Зона**: OAuth PKCE flow (Authorization Code + PKCE, без client secret в клиенте),
  refresh-token ротация, безопасное хранение токена (OS keychain через `keytar`).
- **Файлы**: `src/main/auth/*`
- **Не трогает**: renderer, UI

### 2. `playback-agent`
- **Зона**: интеграция Web Playback SDK, инициализация плеера, обработка событий
  (`player_state_changed`, `ready`, ошибки), управление другими Spotify Connect устройствами
  через Web API (`/me/player`).
- **Файлы**: `src/renderer/playback/*`
- **Контракт наружу**: эмитит `{trackId, artist, title, durationMs, positionMs, isPlaying}`

### 3. `lyrics-agent`
- **Зона**: запрос к lrclib.net по (artist, title, duration; ±2 сек толеранс для матчинга),
  парсинг LRC → массив `{timeMs, text}`, обработка "текст не найден".
- **Файлы**: `src/renderer/lyrics/*`
- **Контракт наружу**: отдаёт массив строк с таймкодами по trackId

### 4. `sync-agent`
- **Зона**: маппинг текущей `positionMs` плеера на индекс активной строки лирики,
  сглаживание (debounce на дрейф позиции), выдача "следующие N строк" для предзагрузки перевода.
- **Файлы**: `src/renderer/sync/*`
- **Важно**: чистая логика без DOM — легко тестируется юнит-тестами

### 5. `translation-agent`
- **Зона**: очередь перевода строк (параллельный батч на локальный Ollama), кэш в SQLite
  по хэшу текста+языка.
- **Файлы**: `src/main/translation/*`, `src/main/db/*`
- **IPC**: `translate:batch(lines[], targetLang) → translations[]`

### 6. `ui-agent`
- **Зона**: React/vanilla UI компонент построчного отображения (оригинал + перевод под строкой),
  автоскролл к активной строке, настройки (язык перевода, шрифт, показать/скрыть перевод).
- **Файлы**: `src/renderer/ui/*`
- **Использует**: события от sync-agent и translation-agent, ничего не знает про сеть

## Порядок работы

1. `auth-agent` — рабочий OAuth, можно получить access token
2. `playback-agent` — трек играет, позиция стримится
3. `lyrics-agent` — для тестового трека приходит массив строк с таймкодами
4. `sync-agent` — активная строка подсвечивается синхронно с аудио
5. `translation-agent` — перевод строк с кэшем
6. `ui-agent` — собирает всё в интерфейс

## Решённые вопросы

- **API перевода**: локальный Ollama, см. блок "Стек" выше. Это уже вторая смена решения
  (изначально — DeepL+LibreTranslate, затем чистый LibreTranslate, теперь Ollama) — если
  снова понадобится сторонний API, сверить актуальность прежде чем возвращаться к нему.
- **Целевой язык перевода**: выбираемый в UI (настройка, не константа).
- **Offline-режим**: не нужен в первой версии как отдельная фича, но перевод через Ollama
  фактически и так работает офлайн (только lrclib.net и Spotify API требуют сеть). SQLite-кэш
  переводов остаётся — снижает нагрузку на локальную модель при повторном прослушивании.

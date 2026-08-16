import { PlaybackPoller } from "./playback/player.js";
import type { PlaybackState } from "./playback/types.js";
import { fetchLyrics } from "./lyrics/lyricsClient.js";
import type { LyricsLine } from "./lyrics/types.js";
import { SyncEngine } from "./sync/syncEngine.js";
import type { SyncLineChange } from "./sync/types.js";
import { LyricsView } from "./ui/lyricsView.js";
import { PlayerBar } from "./ui/playerBar.js";
import { SettingsPanel } from "./ui/settingsPanel.js";
import { AVAILABLE_LANGUAGES, loadSettings, saveSettings } from "./ui/settings.js";
import type { UiSettings } from "./ui/types.js";
import { initTitleBar } from "./ui/titleBar.js";
import { setupPopover } from "./ui/popover.js";

const authGateEl = document.getElementById("auth-gate") as HTMLDivElement;
const authStatusEl = document.getElementById("auth-status") as HTMLParagraphElement;
const loginBtn = document.getElementById("login") as HTMLButtonElement;
const lyricsContainerEl = document.getElementById("lyrics-view") as HTMLDivElement;
const playerBarEl = document.getElementById("player-bar") as HTMLDivElement;
const settingsPopoverEl = document.getElementById("settings-popover") as HTMLDivElement;
const settingsToggleBtn = document.getElementById("settings-toggle") as HTMLButtonElement;

function setAuthStatusText(text: string): void {
  authStatusEl.textContent = text;
}

function showAuthGate(): void {
  authGateEl.hidden = false;
  lyricsContainerEl.hidden = true;
  playerBarEl.hidden = true;
}

function showApp(): void {
  authGateEl.hidden = true;
  lyricsContainerEl.hidden = false;
  playerBarEl.hidden = false;
}

const popover = setupPopover(settingsPopoverEl, settingsToggleBtn);
initTitleBar({ onSettingsToggle: () => popover.toggle() });

// --- Плеер ---

const playback = new PlaybackPoller();
let lastState: PlaybackState | null = null;

const playerBar = new PlayerBar({
  container: playerBarEl,
  onTogglePlay: () => void playback.togglePlay(lastState?.isPlaying ?? false),
  onPrev: () => void playback.previousTrack(),
  onNext: () => void playback.nextTrack(),
  onSeek: (positionMs) => void playback.seek(positionMs),
});

playback.addEventListener("state-changed", (event) => {
  lastState = (event as CustomEvent<PlaybackState>).detail;
  playerBar.setPlaybackState(lastState);
});

playback.addEventListener("nothing-playing", () => {
  lastState = null;
  playerBar.setPlaybackState(null);
});

playback.addEventListener("error", (event) => {
  const detail = (event as CustomEvent<{ message: string }>).detail;
  console.error("Ошибка запроса статуса воспроизведения:", detail.message);
});

// --- Lyrics + перевод + UI ---

const lyricsView = new LyricsView(lyricsContainerEl, (timeMs) => void playback.seek(timeMs));
const syncEngine = new SyncEngine();
let settings: UiSettings = loadSettings();
lyricsView.applySettings(settings);

let currentTrackId: string | null = null;
let currentLines: LyricsLine[] = [];
/** Индексы строк, уже переведённые на settings.targetLang для текущего трека. Сбрасывается при смене трека или языка. */
const translatedIndexes = new Set<number>();
const translationsInFlight = new Set<number>();

function resetTranslationState(): void {
  translatedIndexes.clear();
  translationsInFlight.clear();
}

/** Переводит недостающие строки батчем (не по одной) и раскладывает результат по LyricsView. */
function ensureTranslated(indexes: number[]): void {
  const missing = [...new Set(indexes)].filter(
    (i) =>
      i >= 0 &&
      i < currentLines.length &&
      currentLines[i].text.length > 0 &&
      !translatedIndexes.has(i) &&
      !translationsInFlight.has(i),
  );
  if (missing.length === 0) return;

  for (const i of missing) translationsInFlight.add(i);
  const lang = settings.targetLang;
  const texts = missing.map((i) => currentLines[i].text);

  window.spotikTranslation
    .translateBatch(texts, lang)
    .then((results) => {
      // Пока перевод летал в main-процесс, могли сменить трек или язык — тогда результат уже не актуален.
      if (lang !== settings.targetLang) return;
      for (const i of missing) translationsInFlight.delete(i);
      results.forEach((text, j) => {
        const index = missing[j];
        translatedIndexes.add(index);
        lyricsView.setTranslation(index, text);
      });
    })
    .catch((err) => {
      for (const i of missing) translationsInFlight.delete(i);
      console.error("Ошибка перевода строк лирики:", err);
    });
}

const UPCOMING_TRANSLATE_COUNT = 3;

syncEngine.addEventListener("line-changed", (event) => {
  const { index } = (event as CustomEvent<SyncLineChange>).detail;
  lyricsView.setActiveIndex(index);
  const upcoming = Array.from({ length: UPCOMING_TRANSLATE_COUNT }, (_, k) => index + 1 + k);
  ensureTranslated([index, ...upcoming]);
});

async function loadLyricsForTrack(state: PlaybackState): Promise<void> {
  currentTrackId = state.trackId;
  currentLines = [];
  resetTranslationState();
  lyricsView.showMessage("Ищу текст песни…");

  try {
    const result = await fetchLyrics(state.artist, state.title, state.durationMs);
    if (currentTrackId !== state.trackId) return; // трек сменился, пока текст летел по сети

    if (result.status === "not-found") {
      lyricsView.showMessage("Текст для этого трека не нашёлся");
      return;
    }
    if (result.status === "instrumental") {
      lyricsView.showMessage("Трек без слов — просто послушайте");
      return;
    }

    currentLines = result.lines;
    lyricsView.setLines(currentLines);
    lyricsView.applySettings(settings);
    syncEngine.setLines(currentLines);
    syncEngine.start();
    ensureTranslated([0, 1, 2, 3]);
  } catch (err) {
    if (currentTrackId !== state.trackId) return;
    lyricsView.showMessage(`Не удалось загрузить текст: ${String(err)}`);
  }
}

playback.addEventListener("state-changed", (event) => {
  const state = (event as CustomEvent<PlaybackState>).detail;
  syncEngine.setPlaybackState(state);
  if (state.trackId && state.trackId !== currentTrackId) {
    void loadLyricsForTrack(state);
  }
});

playback.addEventListener("nothing-playing", () => {
  currentTrackId = null;
  currentLines = [];
  resetTranslationState();
  syncEngine.stop();
  lyricsView.showMessage("Сейчас ничего не играет");
});

new SettingsPanel({
  container: settingsPopoverEl,
  initial: settings,
  languages: AVAILABLE_LANGUAGES,
  onChange: (next) => {
    const langChanged = next.targetLang !== settings.targetLang;
    settings = next;
    saveSettings(settings);
    lyricsView.applySettings(settings);
    if (langChanged) {
      resetTranslationState();
      const index = syncEngine.getActiveIndex();
      const upcoming = Array.from({ length: UPCOMING_TRANSLATE_COUNT }, (_, k) => index + 1 + k);
      ensureTranslated([index, ...upcoming]);
    }
  },
});

const popoverDivider = document.createElement("hr");
popoverDivider.className = "popover-divider";
const logoutBtn = document.createElement("button");
logoutBtn.type = "button";
logoutBtn.className = "popover-logout";
logoutBtn.textContent = "Выйти из аккаунта";
settingsPopoverEl.append(popoverDivider, logoutBtn);

logoutBtn.addEventListener("click", async () => {
  popover.close();
  playback.stop();
  lastState = null;
  playerBar.setPlaybackState(null);
  showAuthGate();
  setAuthStatusText("Выхожу…");
  await window.spotikAuth.logout();
});

// --- Аутентификация ---

async function refreshProfile(): Promise<void> {
  const token = await window.spotikAuth.getAccessToken();
  if (!token) {
    showAuthGate();
    loginBtn.hidden = false;
    setAuthStatusText("Не залогинен");
    return;
  }
  try {
    const res = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      showAuthGate();
      loginBtn.hidden = false;
      setAuthStatusText(`Залогинен, но /v1/me вернул ${res.status}`);
      return;
    }
    showApp();
    lyricsView.showMessage("Сейчас ничего не играет");
    playback.start();
  } catch (err) {
    showAuthGate();
    loginBtn.hidden = false;
    setAuthStatusText(`Ошибка запроса профиля: ${String(err)}`);
  }
}

loginBtn.addEventListener("click", async () => {
  loginBtn.hidden = true;
  setAuthStatusText("Открываю окно логина…");
  try {
    const result = await window.spotikAuth.login();
    if (!result.ok) {
      loginBtn.hidden = false;
      setAuthStatusText(`Ошибка логина: ${result.error}`);
    }
  } catch (err) {
    loginBtn.hidden = false;
    setAuthStatusText(`Ошибка логина: ${String(err)}`);
  }
});

window.spotikAuth.onStatusChanged((status) => {
  if (status.loggedIn) {
    void refreshProfile();
  } else {
    showAuthGate();
    loginBtn.hidden = false;
    setAuthStatusText("Не залогинен");
  }
});

void (async () => {
  const status = await window.spotikAuth.getStatus();
  if (status.loggedIn) {
    void refreshProfile();
  } else {
    loginBtn.hidden = false;
    setAuthStatusText("Не залогинен");
  }
})();

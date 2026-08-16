import { getTranslationConfig } from "./config";

interface OllamaGenerateResponse {
  response: string;
}

/** Английские названия языков в промпте — надёжнее для модели, чем ISO-коды или родная письменность. */
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ru: "Russian",
  es: "Spanish",
  de: "German",
  fr: "French",
  it: "Italian",
  pt: "Portuguese",
  tr: "Turkish",
  ja: "Japanese",
  zh: "Chinese",
};

function buildPrompt(text: string, targetLang: string, strict: boolean): string {
  const languageName = LANGUAGE_NAMES[targetLang] ?? targetLang;
  const strictSuffix = strict
    ? ` Every single word of your output must be in ${languageName} — ` +
      `do not switch to any other language partway through, even for slang or idioms.`
    : "";
  return (
    `Translate the following song lyric line to ${languageName}. ` +
    "Output ONLY the translation, no quotes, no explanations, no transliteration." +
    strictSuffix +
    `\n\nText: ${text}`
  );
}

/** Диапазоны CJK-письменности — маркер "соскальзывания" модели в китайский/японский по ходу ответа. */
const CJK_PATTERN = /[一-鿿぀-ヿ]/;

function hasUnexpectedScript(translation: string, targetLang: string): boolean {
  if (targetLang === "zh" || targetLang === "ja") return false;
  return CJK_PATTERN.test(translation);
}

async function requestTranslation(text: string, targetLang: string, strict: boolean): Promise<string> {
  const config = getTranslationConfig();
  const res = await fetch(`${config.ollamaUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.ollamaModel,
      prompt: buildPrompt(text, targetLang, strict),
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama вернул ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as OllamaGenerateResponse;
  return data.response.trim();
}

/**
 * qwen2.5 (и другие модели с большой долей китайских данных в претрейне) иногда
 * "соскальзывает" в китайский посреди строки, особенно на сленге/идиомах — промпт
 * этого не гарантирует. Если в ответе обнаружены неожиданные CJK-символы, делаем
 * один повторный запрос с усиленной формулировкой; итоговый результат всё равно
 * может содержать посторонний текст — это ограничение самой модели, а не бага
 * парсинга.
 */
async function translateOne(text: string, targetLang: string): Promise<string> {
  const first = await requestTranslation(text, targetLang, false);
  if (!hasUnexpectedScript(first, targetLang)) return first;

  const retried = await requestTranslation(text, targetLang, true);
  return hasUnexpectedScript(retried, targetLang) ? first : retried;
}

/**
 * Переводит строки лирики через локальный Ollama. В отличие от LibreTranslate
 * (один HTTP-запрос на весь батч), Ollama не понимает пакетный формат
 * надёжно — модель нередко переставляет/дублирует строки при попытке
 * перевести JSON-массив за один вызов. Поэтому каждая строка — отдельный
 * запрос `/api/generate`, а батч распараллелен через Promise.all: для
 * типичного размера батча (текущая строка + несколько следующих, см.
 * ensureTranslated в renderer/main.ts) это быстрее одного большого запроса
 * и не теряет порядок строк.
 */
export async function translateViaOllama(texts: string[], targetLang: string): Promise<string[]> {
  if (texts.length === 0) return [];
  return Promise.all(texts.map((text) => translateOne(text, targetLang)));
}

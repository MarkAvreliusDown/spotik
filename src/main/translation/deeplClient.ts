interface DeeplTranslateResponse {
  translations: Array<{ text: string }>;
}

/** Коды целевого языка DeepL отличаются от ISO-кодов, используемых остальным приложением. */
const DEEPL_LANG_CODES: Record<string, string> = {
  en: "EN",
  ru: "RU",
  es: "ES",
  de: "DE",
  fr: "FR",
  it: "IT",
  pt: "PT-PT",
  tr: "TR",
  ja: "JA",
  zh: "ZH",
};

/**
 * Переводит строки лирики через облачный DeepL Free API — альтернатива Ollama
 * для машин без GPU, достаточного для локальной модели. В отличие от Ollama
 * (по запросу на строку), DeepL умеет переводить массив текстов одним запросом
 * без потери порядка/количества строк — используем это напрямую.
 */
export async function translateViaDeepL(texts: string[], targetLang: string, apiKey: string): Promise<string[]> {
  if (texts.length === 0) return [];

  const res = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `DeepL-Auth-Key ${apiKey}`,
    },
    body: JSON.stringify({
      text: texts,
      target_lang: DEEPL_LANG_CODES[targetLang] ?? targetLang.toUpperCase(),
    }),
  });

  if (!res.ok) {
    if (res.status === 403) throw new Error("DeepL: неверный API-ключ");
    if (res.status === 456) throw new Error("DeepL: превышена квота бесплатного тарифа");
    throw new Error(`DeepL вернул ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as DeeplTranslateResponse;
  return data.translations.map((t) => t.text);
}

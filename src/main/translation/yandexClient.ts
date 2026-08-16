interface YandexTranslateResponse {
  translations: Array<{ text: string }>;
}

/**
 * Переводит строки лирики через Yandex Cloud Translate — альтернатива DeepL для
 * пользователей из регионов, которые DeepL блокирует по IP (HTTP 451). Как и DeepL,
 * один запрос на весь батч, порядок строк в ответе сохраняется.
 */
export async function translateViaYandex(
  texts: string[],
  targetLang: string,
  apiKey: string,
  folderId: string,
): Promise<string[]> {
  if (texts.length === 0) return [];

  const res = await fetch("https://translate.api.cloud.yandex.net/translate/v2/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Api-Key ${apiKey}`,
    },
    body: JSON.stringify({
      folderId,
      texts,
      targetLanguageCode: targetLang,
    }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Yandex Translate: неверный API-ключ");
    if (res.status === 403) throw new Error("Yandex Translate: нет доступа (проверьте folderId и права сервисного аккаунта)");
    throw new Error(`Yandex Translate вернул ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as YandexTranslateResponse;
  return data.translations.map((t) => t.text);
}

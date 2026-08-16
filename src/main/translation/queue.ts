import { cacheKey, getCached, setCached } from "../db/translationCache";
import { translateViaOllama } from "./ollamaClient";

/**
 * Переводит строки лирики батчем, с кэшем в SQLite по хэшу (текст + язык).
 * На LibreTranslate уходят только строки, которых нет в кэше — при повторном
 * прослушивании того же трека (или с общими строками припева) сеть не
 * трогается вовсе. Порядок результата соответствует порядку `lines`.
 */
export async function translateBatch(lines: string[], targetLang: string): Promise<string[]> {
  if (lines.length === 0) return [];

  const hashes = lines.map((line) => cacheKey(line, targetLang));
  const cached = await getCached(hashes);

  const missingIndexes: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!cached.has(hashes[i])) missingIndexes.push(i);
  }

  if (missingIndexes.length > 0) {
    const missingTexts = missingIndexes.map((i) => lines[i]);
    const translated = await translateViaOllama(missingTexts, targetLang);

    const toCache: Array<{ hash: string; translated: string }> = [];
    for (let j = 0; j < missingIndexes.length; j++) {
      const i = missingIndexes[j];
      cached.set(hashes[i], translated[j]);
      toCache.push({ hash: hashes[i], translated: translated[j] });
    }
    await setCached(toCache);
  }

  return hashes.map((hash) => cached.get(hash) ?? "");
}

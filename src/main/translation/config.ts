export interface TranslationConfig {
  ollamaUrl: string;
  ollamaModel: string;
}

let cached: TranslationConfig | null = null;

/**
 * Локальный Ollama вместо внешнего API перевода — уже установлен и запущен
 * у пользователя, работает офлайн, без ключей и лимитов. Значения по
 * умолчанию рассчитаны на стандартную установку Ollama (127.0.0.1:11434);
 * .env переопределяет их, только если инстанс/модель нестандартные.
 */
export function getTranslationConfig(): TranslationConfig {
  if (!cached) {
    cached = {
      ollamaUrl: process.env.OLLAMA_URL ?? "http://127.0.0.1:11434",
      ollamaModel: process.env.OLLAMA_MODEL ?? "gemma2:9b",
    };
  }
  return cached;
}

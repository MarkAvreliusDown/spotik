import keytar from "keytar";

const SERVICE = "spotik";
const ACCOUNT = "yandex-translate-credentials";

export interface YandexCredentials {
  apiKey: string;
  folderId: string;
}

export async function getYandexCredentials(): Promise<YandexCredentials | null> {
  const raw = await keytar.getPassword(SERVICE, ACCOUNT);
  if (!raw) return null;
  return JSON.parse(raw) as YandexCredentials;
}

export function setYandexCredentials(creds: YandexCredentials): Promise<void> {
  return keytar.setPassword(SERVICE, ACCOUNT, JSON.stringify(creds));
}

export async function clearYandexCredentials(): Promise<void> {
  await keytar.deletePassword(SERVICE, ACCOUNT);
}

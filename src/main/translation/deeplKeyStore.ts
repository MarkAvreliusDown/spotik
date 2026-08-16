import keytar from "keytar";

const SERVICE = "spotik";
const ACCOUNT = "deepl-api-key";

export function getDeeplApiKey(): Promise<string | null> {
  return keytar.getPassword(SERVICE, ACCOUNT);
}

export function setDeeplApiKey(key: string): Promise<void> {
  return keytar.setPassword(SERVICE, ACCOUNT, key);
}

export async function clearDeeplApiKey(): Promise<void> {
  await keytar.deletePassword(SERVICE, ACCOUNT);
}

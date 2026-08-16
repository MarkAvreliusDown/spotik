import keytar from "keytar";

const SERVICE = "spotik";
const ACCOUNT = "spotify-refresh-token";

export function getRefreshToken(): Promise<string | null> {
  return keytar.getPassword(SERVICE, ACCOUNT);
}

export function setRefreshToken(token: string): Promise<void> {
  return keytar.setPassword(SERVICE, ACCOUNT, token);
}

export async function clearRefreshToken(): Promise<void> {
  await keytar.deletePassword(SERVICE, ACCOUNT);
}

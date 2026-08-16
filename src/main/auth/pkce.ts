import { randomBytes, createHash } from "node:crypto";

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier(): string {
  return base64url(randomBytes(64));
}

export function codeChallengeFromVerifier(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest();
  return base64url(hash);
}

export function generateState(): string {
  return base64url(randomBytes(16));
}

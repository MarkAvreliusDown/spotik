export interface AuthStatus {
  loggedIn: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

export class AuthError extends Error {
  constructor(public readonly code: "SESSION_EXPIRED" | "LOGIN_CANCELLED" | "LOGIN_FAILED", message: string) {
    super(message);
    this.name = "AuthError";
  }
}

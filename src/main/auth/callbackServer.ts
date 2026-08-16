import http from "node:http";
import { AuthConfig } from "./config";
import { AuthError } from "./types";

const SUCCESS_HTML =
  "<html><body><h2>Вход выполнен</h2><p>Можно закрыть это окно.</p></body></html>";
const ERROR_HTML = (message: string) =>
  `<html><body><h2>Ошибка входа</h2><p>${message}</p></body></html>`;

export interface CallbackResult {
  code: string;
}

export function waitForCallback(
  config: AuthConfig,
  expectedState: string
): {
  promise: Promise<CallbackResult>;
  cancel: () => void;
} {
  let settled = false;
  let cancelImpl: () => void = () => {};

  const promise = new Promise<CallbackResult>((resolve, reject) => {
    const server: http.Server = http.createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400).end();
        return;
      }
      const url = new URL(req.url, `http://127.0.0.1:${config.callbackPort}`);
      if (url.pathname !== config.callbackPath) {
        res.writeHead(404).end();
        return;
      }

      const error = url.searchParams.get("error");
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (error) {
        res.writeHead(200, { "Content-Type": "text/html" }).end(ERROR_HTML(error));
        settle(() => reject(new AuthError("LOGIN_FAILED", `Spotify вернул ошибку: ${error}`)));
        return;
      }

      if (state !== expectedState) {
        res.writeHead(200, { "Content-Type": "text/html" }).end(ERROR_HTML("state mismatch"));
        settle(() =>
          reject(new AuthError("LOGIN_FAILED", "state mismatch — возможна CSRF-атака, попытка отклонена"))
        );
        return;
      }

      if (!code) {
        res.writeHead(200, { "Content-Type": "text/html" }).end(ERROR_HTML("нет кода авторизации"));
        settle(() => reject(new AuthError("LOGIN_FAILED", "в редиректе отсутствует code")));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" }).end(SUCCESS_HTML);
      settle(() => resolve({ code }));
    });

    function settle(action: () => void) {
      if (settled) return;
      settled = true;
      action();
      server.close();
    }

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        settle(() =>
          reject(
            new AuthError(
              "LOGIN_FAILED",
              `Порт ${config.callbackPort} уже занят — возможно, не закрылся предыдущий запуск приложения.`
            )
          )
        );
      } else {
        settle(() => reject(new AuthError("LOGIN_FAILED", err.message)));
      }
    });

    server.listen(config.callbackPort, "127.0.0.1");

    cancelImpl = () => {
      settle(() => reject(new AuthError("LOGIN_CANCELLED", "Вход отменён пользователем")));
    };
  });

  return {
    promise,
    cancel: () => cancelImpl(),
  };
}

export interface TitleBarOptions {
  onSettingsToggle: () => void;
}

/** Кастомный титлбар: кнопки свернуть/развернуть/закрыть окно + переключатель поповера настроек. */
export function initTitleBar(options: TitleBarOptions): void {
  const settingsBtn = document.getElementById("settings-toggle") as HTMLButtonElement;
  const minimizeBtn = document.getElementById("win-minimize") as HTMLButtonElement;
  const maximizeBtn = document.getElementById("win-maximize") as HTMLButtonElement;
  const closeBtn = document.getElementById("win-close") as HTMLButtonElement;

  settingsBtn.addEventListener("click", () => options.onSettingsToggle());
  minimizeBtn.addEventListener("click", () => void window.spotikWindow.minimize());
  maximizeBtn.addEventListener("click", () => void window.spotikWindow.maximize());
  closeBtn.addEventListener("click", () => void window.spotikWindow.close());
}

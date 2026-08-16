export interface Popover {
  toggle(): void;
  close(): void;
}

/** Открытие/закрытие поповера по кнопке, с закрытием по клику вне и по Esc. */
export function setupPopover(popoverEl: HTMLElement, toggleBtn: HTMLButtonElement): Popover {
  function close(): void {
    popoverEl.hidden = true;
    toggleBtn.setAttribute("aria-expanded", "false");
  }

  function open(): void {
    popoverEl.hidden = false;
    toggleBtn.setAttribute("aria-expanded", "true");
  }

  function toggle(): void {
    if (popoverEl.hidden) open();
    else close();
  }

  document.addEventListener("pointerdown", (event) => {
    if (popoverEl.hidden) return;
    const target = event.target as Node;
    if (popoverEl.contains(target) || toggleBtn.contains(target)) return;
    close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !popoverEl.hidden) close();
  });

  return { toggle, close };
}

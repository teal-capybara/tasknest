/* ==========================================================================
   SCREENS + TOAST helpers
   Only one "screen" (a top-level block in index.html) is visible at a time.
   ========================================================================== */

const SCREENS = ["loading", "setup", "error", "signin", "app"];

export function showScreen(name) {
  for (const s of SCREENS) {
    const el = document.getElementById(`screen-${s}`);
    if (el) el.hidden = s !== name;
  }
}

let toastTimer = null;

/** Show a short message at the bottom of the screen for a few seconds. */
export function toast(message, ms = 3500) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

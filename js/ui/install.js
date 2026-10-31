/* ==========================================================================
   INSTALL BUTTON
   Chrome on Android fires a "beforeinstallprompt" event when the app can be
   installed. It fires EARLY (before the Settings screen exists), so
   captureInstallPrompt() runs at startup and keeps the event. When the Settings
   screen is drawn it calls bindInstallCard() to wire up its button.
   If the event never fires (already installed, or an unsupported browser) the
   card just shows the manual instructions.
   ========================================================================== */

let deferredPrompt = null;
let button = null;
let text = null;

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches;

export function captureInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();   // we show our own button instead of Chrome's mini-bar
    deferredPrompt = event;
    refresh();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    if (text) text.textContent = "TaskNest is installed on this device.";
    refresh();
  });
}

/** Called by the Settings screen once its install card exists. */
export function bindInstallCard(buttonEl, textEl) {
  button = buttonEl;
  text = textEl;
  button.onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    refresh();
  };
  refresh();
}

function refresh() {
  if (!button) return;
  button.hidden = !deferredPrompt;
  if (isStandalone()) text.textContent = "You're using the installed app.";
}

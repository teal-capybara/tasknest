/* ==========================================================================
   INSTALL BUTTON
   Chrome on Android fires a "beforeinstallprompt" event when the app can be
   installed. We keep it and show our own Install button. If it never fires
   (already installed, or a browser that does not support it), the card just
   shows the manual instructions that are already in index.html.
   ========================================================================== */

let deferredPrompt = null;

export function initInstallButton() {
  const button = document.getElementById("install-button");
  const text = document.getElementById("install-text");

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();      // stop Chrome's default mini-bar; we use our own button
    deferredPrompt = event;
    button.hidden = false;
  });

  button.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    button.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    button.hidden = true;
    text.textContent = "TaskNest is installed on this device.";
  });

  // Already running as an installed app?
  if (window.matchMedia("(display-mode: standalone)").matches) {
    text.textContent = "You're using the installed app.";
  }
}

/* ==========================================================================
   MAIN: starts the app and connects the other files together.

   Order of events:
     1. Register the service worker (makes the app open offline).
     2. Check that js/config.js has been filled in.
     3. Start Firebase (with offline storage).
     4. Watch sign-in state:
          signed out -> show the sign-in screen
          signed in  -> start database listeners and show the app
   ========================================================================== */

import { APP_NAME, isConfigured } from "./config.js";
import { initFirebase } from "./firebase.js";
import { watchAuth, signIn, signOutUser, finishRedirectSignIn, friendlyAuthError } from "./auth.js";
import { applyTheme, currentTheme, isValidTheme } from "./theme.js";
import { watchSettings, saveSettings } from "./db/settings.js";
import { watchSyncTest, addPing } from "./db/syncTest.js";
import { onChange as onSyncChange, describe, currentState, hasPendingChanges, forgetAll } from "./sync-status.js";
import { showScreen, toast } from "./ui/screens.js";
import { renderThemePicker, markSelected } from "./ui/themePicker.js";
import { initInstallButton } from "./ui/install.js";

const $ = (id) => document.getElementById(id);

let fb = null;            // the Firebase handles once started
let stopListeners = [];   // functions that stop the database listeners
let activeUid = null;     // who is signed in right now

registerServiceWorker();
initInstallButton();
start();

/* ------------------------------------------------------------------ startup */

async function start() {
  showScreen("loading");

  if (!isConfigured()) { showScreen("setup"); return; }

  try {
    fb = await initFirebase();
  } catch (err) {
    console.error("Firebase failed to start:", err);
    $("error-message").textContent = navigator.onLine
      ? "The app could not load its Firebase code. Check your connection and try again."
      : "You're offline and this device has not opened the app online yet. Connect to the internet once, then try again.";
    $("error-retry").onclick = () => location.reload();
    showScreen("error");
    return;
  }

  rememberFirebaseFilesForOffline();
  wireStaticButtons();

  // If a redirect-based sign-in just finished, surface any error from it.
  const redirectError = await finishRedirectSignIn(fb);
  if (redirectError) showSignInError(friendlyAuthError(redirectError));

  // Runs immediately with the saved session (even offline), then on every change.
  watchAuth(fb, (user) => {
    if (user) enterApp(user);
    else leaveApp();
  });

  window.addEventListener("online", updateSigninOfflineNote);
  window.addEventListener("offline", updateSigninOfflineNote);
}

/* ------------------------------------------------------------ signed-in app */

function enterApp(user) {
  if (activeUid === user.uid) return; // already set up (auth can fire repeatedly)
  stopAllListeners();
  activeUid = user.uid;

  // Account card
  $("welcome-title").textContent = `Hello, ${(user.displayName || "there").split(" ")[0]}!`;
  $("account-name").textContent = user.displayName || "—";
  $("account-email").textContent = user.email || "—";
  $("account-uid").textContent = user.uid;

  // Theme picker + settings listener
  renderThemePicker($("theme-grid"), currentTheme(), (id) => chooseTheme(user.uid, id));
  stopListeners.push(
    watchSettings(fb, user.uid, (settings) => {
      // Only follow the cloud value if one has been saved; otherwise keep the local choice.
      if (isValidTheme(settings.theme) && settings.theme !== currentTheme()) {
        applyTheme(settings.theme);
      }
      markSelected($("theme-grid"), currentTheme());
    })
  );

  // Offline check card
  stopListeners.push(
    watchSyncTest(fb, user.uid, (data) => {
      $("ping-count").textContent = data.count ?? 0;
      $("ping-last").textContent = data.lastTapAt
        ? "Last tap: " + new Date(data.lastTapAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : "No taps yet";
    })
  );

  showSyncDetail(describe());
  if (!fb.offlineReady) {
    $("sync-detail").textContent = "Warning: this browser blocked offline storage, so offline editing will not work here.";
  }

  showScreen("app");
}

function leaveApp() {
  stopAllListeners();
  activeUid = null;
  $("signin-button").disabled = false;
  updateSigninOfflineNote();
  showScreen("signin");
}

function stopAllListeners() {
  stopListeners.forEach((stop) => stop());
  stopListeners = [];
  forgetAll();
}

/* ------------------------------------------------------------- user actions */

function wireStaticButtons() {
  // Sign in
  $("signin-button").onclick = async () => {
    showSignInError("");
    $("signin-button").disabled = true;
    try {
      await signIn(fb);
    } catch (err) {
      showSignInError(friendlyAuthError(err));
    } finally {
      $("signin-button").disabled = false;
    }
  };

  // Offline check: add 1. The promise only finishes when the CLOUD confirms,
  // which can take forever offline, so we do NOT wait on it. The listener
  // updates the screen instantly from the local copy.
  $("ping-button").onclick = () => {
    addPing(fb, activeUid).catch((err) => toast("Could not save: " + (err.code || err.message)));
  };

  // Copy account id
  $("copy-uid").onclick = async () => {
    try {
      await navigator.clipboard.writeText($("account-uid").textContent);
      toast("Account ID copied");
    } catch (e) {
      toast("Couldn't copy. Select the ID and copy it manually.");
    }
  };

  // Sign out (with an optional "clear this device" step)
  $("signout-button").onclick = () => {
    $("signout-pending-warning").hidden = !hasPendingChanges();
    $("signout-clear").checked = false;
    $("signout-dialog").showModal();
  };
  $("signout-dialog").addEventListener("close", async () => {
    if ($("signout-dialog").returnValue !== "confirm") return;
    const clearLocal = $("signout-clear").checked;
    stopAllListeners();
    activeUid = null;
    await signOutUser(fb);
    if (clearLocal) await clearThisDevice();
  });

  onSyncChange(showSyncDetail);
}

function chooseTheme(uid, themeId) {
  applyTheme(themeId);                          // instant, on this device
  markSelected($("theme-grid"), themeId);
  saveSettings(fb, uid, { theme: themeId })     // saved + synced in the background
    .catch((err) => toast("Theme not saved: " + (err.code || err.message)));
}

/** Removes the offline copy from this browser. Anything not yet synced is lost. */
async function clearThisDevice() {
  try {
    await fb.F.terminate(fb.db);
    await fb.F.clearIndexedDbPersistence(fb.db);
    try { localStorage.removeItem("tasknest.theme"); } catch (e) { /* ignore */ }
  } catch (err) {
    // Usually happens when the app is open in another tab. Close it and retry.
    console.warn("Could not clear local data:", err);
    toast("Couldn't clear this device's data. Close other TaskNest tabs and try again.", 6000);
    return;
  }
  location.reload();
}

/* ------------------------------------------------------------- small helpers */

function showSignInError(message) {
  const el = $("signin-error");
  el.textContent = message;
  el.hidden = !message;
}

function updateSigninOfflineNote() {
  $("signin-offline-note").hidden = navigator.onLine;
}

function showSyncDetail(info) {
  // Don't overwrite the "offline storage blocked" warning.
  if (fb && !fb.offlineReady) return;
  $("sync-detail").textContent = info.detail;
}

/* ----------------------------------------------------------- service worker */

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  let reloadRequested = false;

  navigator.serviceWorker.register("service-worker.js").then((reg) => {
    // A new version was downloaded and is waiting: offer a Reload button.
    const offerUpdate = (worker) => {
      $("update-banner").hidden = false;
      $("update-reload").onclick = () => {
        reloadRequested = true;
        worker.postMessage({ type: "SKIP_WAITING" });
      };
    };
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const worker = reg.installing;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(worker);
      });
    });
  }).catch((err) => console.warn("Service worker not registered:", err));

  // Reload only when YOU pressed Reload (not on the very first install).
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadRequested) location.reload();
  });
}

/**
 * The first time you open the app, the browser downloads the Firebase files
 * BEFORE the service worker is in charge, so the worker never saw them.
 * We tell the worker which files were loaded so it can save them for offline use.
 */
async function rememberFirebaseFilesForOffline() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const urls = performance.getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((url) => url.includes("gstatic.com/firebasejs/"));
    if (reg.active && urls.length) reg.active.postMessage({ type: "CACHE_URLS", urls });
  } catch (e) { /* not critical */ }
}

// Keep APP_NAME referenced so renaming in config.js is a one-place change.
document.title = APP_NAME;

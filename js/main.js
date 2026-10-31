/* ==========================================================================
   MAIN: starts the app and connects the other files together.

   Order of events:
     1. Register the service worker (makes the app open offline).
     2. Check that js/config.js has been filled in.
     3. Start Firebase (with offline storage).
     4. Watch sign-in state:
          signed out -> show the sign-in screen
          signed in  -> start the database listeners (js/data.js), then the
                        router (js/router.js) draws the right screen

   To add a new screen: write a view in js/views/, then add ONE line to ROUTES.
   ========================================================================== */

import { isConfigured } from "./config.js";
import { initFirebase } from "./firebase.js";
import { watchAuth, signIn, signOutUser, finishRedirectSignIn, friendlyAuthError } from "./auth.js";
import { startData } from "./data.js";
import { defineRoutes, startRouter, stopRouter } from "./router.js";
import { hasPendingChanges, forgetAll } from "./sync-status.js";
import { showScreen, toast } from "./ui/screens.js";
import { captureInstallPrompt } from "./ui/install.js";
import { session } from "./session.js";
import { clearAllDrafts } from "./logic/drafts.js";
import { getSettings } from "./state.js";

import { dashboardView } from "./views/dashboardView.js";
import { tasksView } from "./views/tasksView.js";
import { taskFormView } from "./views/taskFormView.js";
import { taskDetailView } from "./views/taskDetailView.js";
import { manageView } from "./views/manageView.js";
import { settingsView } from "./views/settingsView.js";

/* path: the address after #   nav: which menu item to highlight   view: the screen.
   hideAdd: true hides the floating "Add task" button on that screen.
   Order matters: "/task/new" must come before "/task/:id". */
/** "#/home" has no screen of its own: it sends you to the start screen you chose in Settings, View. */
function homeView() {
  const target = getSettings().defaultScreen === "tasks" ? "/tasks" : "/dashboard";
  location.replace(`#${target}`);
  return {};
}

const ROUTES = [
  { path: "/home",          nav: "dashboard", title: "Home",      view: homeView },
  { path: "/dashboard",     nav: "dashboard", title: "Home",      view: dashboardView },
  { path: "/tasks",         nav: "tasks",    title: "Tasks",     view: tasksView },
  { path: "/task/new",      nav: "tasks",    title: "Add task",  view: taskFormView,  hideAdd: true },
  { path: "/task/:id/edit", nav: "tasks",    title: "Edit task", view: taskFormView,  hideAdd: true },
  { path: "/task/:id",      nav: "tasks",    title: "Task",      view: taskDetailView },
  { path: "/manage",        nav: "manage",   title: "Manage",    view: manageView },
  { path: "/settings",          nav: "settings", title: "Settings", view: settingsView },
  { path: "/settings/:section", nav: "settings", title: "Settings", view: settingsView },
];

const $ = (id) => document.getElementById(id);

let fb = null;          // the Firebase handles once started
let stopData = null;    // stops the database listeners
let activeUid = null;   // who is signed in right now

registerServiceWorker();
captureInstallPrompt();
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
  wireButtons();
  defineRoutes(ROUTES);

  // If a redirect-based sign-in just finished, surface any error from it.
  const redirectError = await finishRedirectSignIn(fb);
  if (redirectError) showSignInError(friendlyAuthError(redirectError));

  // Runs immediately with the saved session (even offline), then on every change.
  watchAuth(fb, (user) => (user ? enterApp(user) : leaveApp()));

  window.addEventListener("online", updateSigninOfflineNote);
  window.addEventListener("offline", updateSigninOfflineNote);
}

/* ------------------------------------------------------------ signed-in app */

function enterApp(user) {
  if (activeUid === user.uid) return; // auth can fire repeatedly; set up only once
  teardown();
  activeUid = user.uid;

  stopData = startData(fb, user.uid);
  showScreen("app");
  startRouter($("view"));
}

function leaveApp() {
  teardown();
  $("signin-button").disabled = false;
  updateSigninOfflineNote();
  showScreen("signin");
}

function teardown() {
  stopRouter();
  if (stopData) stopData();
  stopData = null;
  activeUid = null;
  forgetAll();
}

/* ------------------------------------------------------------- user actions */

function wireButtons() {
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

  // Settings calls this. The dialog also offers to wipe this device's saved copy.
  session.requestSignOut = () => {
    $("signout-pending-warning").hidden = !hasPendingChanges();
    $("signout-clear").checked = false;
    $("signout-dialog").showModal();
  };
  $("signout-dialog").addEventListener("close", async () => {
    if ($("signout-dialog").returnValue !== "confirm") return;
    const clearLocal = $("signout-clear").checked;
    teardown();
    await signOutUser(fb);
    if (clearLocal) await clearThisDevice();
  });
}

/** Removes the offline copy from this browser. Anything not yet synced is lost. */
async function clearThisDevice() {
  try {
    await fb.F.terminate(fb.db);
    await fb.F.clearIndexedDbPersistence(fb.db);
    try { localStorage.removeItem("tasknest.theme"); } catch (e) { /* ignore */ }
    clearAllDrafts();
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

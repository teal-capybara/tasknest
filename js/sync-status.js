/* ==========================================================================
   SYNC STATUS: the little chip in the header

   Firestore tells us two useful things about every snapshot it delivers:
     metadata.hasPendingWrites : you changed something here that the cloud has
                                 not confirmed yet ("waiting to sync")
     metadata.fromCache        : this data came from the copy on this device,
                                 not (yet) confirmed by the cloud

   Every part of the app that listens to the database calls
   reportSnapshot("some-name", snapshot). We combine all of them into ONE state:

     offline     - the browser has no connection
     error       - the database refused or failed a request
     pending     - something is saved on this device but not yet in the cloud
     connecting  - showing the device copy, still waiting to hear from the cloud
     synced      - everything is confirmed by the cloud

   In later phases the tasks list will call reportSnapshot too, so the chip
   covers the whole app without any changes here.
   ========================================================================== */

const sources = new Map(); // name -> { pending, fromCache, error }
const listeners = new Set();

const LABELS = {
  offline:    { label: "Offline",         detail: "You're offline. Changes are saved on this device and will sync when you reconnect." },
  error:      { label: "Sync problem",    detail: "The database reported a problem. Your changes are still saved on this device." },
  pending:    { label: "Waiting to sync", detail: "Saved on this device. They will upload when you are online and the app is open." },
  connecting: { label: "Connecting…",     detail: "Showing the copy on this device while checking the cloud." },
  synced:     { label: "Synced",          detail: "Everything is saved to the cloud." },
};

/** Work out the single overall state. The order of checks matters. */
export function currentState() {
  if (!navigator.onLine) return "offline";
  const all = [...sources.values()];
  if (all.some((s) => s.error)) return "error";
  if (all.some((s) => s.pending)) return "pending";
  if (all.some((s) => s.fromCache)) return "connecting";
  return "synced";
}

export function describe(state = currentState()) {
  return { state, ...LABELS[state] };
}

/** Called by database listeners each time they receive a snapshot. */
export function reportSnapshot(name, snapshot) {
  sources.set(name, {
    pending: snapshot.metadata.hasPendingWrites,
    fromCache: snapshot.metadata.fromCache,
    error: null,
  });
  render();
}

/** Called by database listeners when they fail (for example permission denied). */
export function reportError(name, error) {
  console.error(`Database listener "${name}" failed:`, error);
  sources.set(name, { pending: false, fromCache: false, error });
  render();
}

/** Stop tracking a listener (used on sign-out). */
export function forget(name) {
  sources.delete(name);
  render();
}

export function forgetAll() {
  sources.clear();
  render();
}

/** True if any listener still has changes that have not reached the cloud. */
export function hasPendingChanges() {
  return [...sources.values()].some((s) => s.pending);
}

/** Lets other UI (e.g. the offline-check card) react to state changes. */
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function render() {
  const info = describe();
  const chip = document.getElementById("sync-indicator");
  if (chip) {
    chip.dataset.state = info.state;
    chip.title = info.detail;
    chip.querySelector(".sync-label").textContent = info.label;
  }
  listeners.forEach((fn) => fn(info));
}

// The browser tells us when the connection drops or returns.
window.addEventListener("online", render);
window.addEventListener("offline", render);

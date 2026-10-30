/* ==========================================================================
   FIREBASE STARTUP

   Loads the Firebase code from Google's CDN (so you do not have to install
   anything) and creates the three things the rest of the app needs:
     - app : the Firebase project connection
     - auth: Google sign-in
     - db  : the Firestore database, WITH OFFLINE STORAGE TURNED ON

   Other files get everything through initFirebase(), which returns:
     { app, auth, db, A, F, offlineReady }
   where A = Firebase Auth functions, F = Firestore functions.

   OFFLINE STORAGE (the important part):
   persistentLocalCache keeps a copy of your data in this browser's IndexedDB.
   - Reads come from that copy first, so the app opens instantly and offline.
   - Writes are saved to the copy immediately and queued; Firestore sends them
     to the cloud automatically when the connection returns.
   persistentMultipleTabManager lets several open tabs/windows share one copy.
   ========================================================================== */

import { firebaseConfig, FIREBASE_VERSION } from "./config.js";

const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

let cached = null; // initialise only once

export async function initFirebase() {
  if (cached) return cached;

  // Load the three Firebase modules in parallel.
  const [appMod, A, F] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-firestore.js`),
  ]);

  const app = appMod.initializeApp(firebaseConfig);
  const auth = A.getAuth(app);

  let db;
  let offlineReady = true;
  try {
    db = F.initializeFirestore(app, {
      localCache: F.persistentLocalCache({
        tabManager: F.persistentMultipleTabManager(),
      }),
    });
  } catch (err) {
    // Some private/locked-down browsers do not allow IndexedDB. The app still
    // works online, but offline editing will NOT be available. We tell the user.
    console.warn("Offline storage unavailable, using memory only:", err);
    db = F.initializeFirestore(app, { localCache: F.memoryLocalCache() });
    offlineReady = false;
  }

  cached = { app, auth, db, A, F, offlineReady };
  return cached;
}

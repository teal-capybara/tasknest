/* ==========================================================================
   CONFIG: the one file you edit during setup.

   1. Paste your Firebase web app values below (README, Part A, step 3).
      These values are NOT secrets. Firebase designs them to be public.
      What actually protects your data is the security rules (firestore.rules)
      plus Google sign-in.
   2. Never paste a "service account" or "private key" here. You will not
      need one for this app.
   ========================================================================== */

export const firebaseConfig = {
  apiKey: "AIzaSyC8gz5_REDuNpoHcx8_Sl_nhlX8HJk11aQ",
  authDomain: "tasknet-xyra-94add.firebaseapp.com",
  projectId: "tasknet-xyra-94add",
  storageBucket: "tasknet-xyra-94add.firebasestorage.app",
  messagingSenderId: "343732564929",
  appId: "1:343732564929:web:e52ae45ff5c7e7f7cf3540"
};

/* Which version of the Firebase code to load from Google's CDN.
   Only change it deliberately, and test sign-in and offline use afterwards.
   (After changing it, also bump VERSION in service-worker.js.) */
export const FIREBASE_VERSION = "10.14.1";

/* App name used in a few messages. The name shown on the home screen comes
   from manifest.webmanifest, so change both if you rename the app. */
export const APP_NAME = "TaskNest";

/* True once you have replaced the placeholder values above. */
export function isConfigured() {
  return !String(firebaseConfig.apiKey).startsWith("PASTE") &&
         !String(firebaseConfig.projectId).startsWith("PASTE");
}

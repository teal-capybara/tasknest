/* ==========================================================================
   AUTHENTICATION (Google sign-in)

   How it works offline:
   - You sign in with Google ONCE, while online.
   - Firebase then stores your session in this browser (IndexedDB).
   - Next time (even with no internet) onAuthStateChanged immediately reports
     you as signed in from that stored session. No login screen offline.
   - The session token quietly refreshes when internet is available. If the
     session ever expires, you are shown the sign-in screen again.
   ========================================================================== */

/** Calls onChange(user | null) now and whenever sign-in state changes. */
export function watchAuth(fb, onChange) {
  return fb.A.onAuthStateChanged(fb.auth, onChange);
}

/**
 * Some phones/browsers block the Google popup. In that case we fall back to a
 * full-page redirect. When the page returns, finishRedirectSignIn() runs.
 */
export async function signIn(fb) {
  const provider = new fb.A.GoogleAuthProvider();
  // Always show the account chooser so you can pick the right Google account.
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    await fb.A.signInWithPopup(fb.auth, provider);
  } catch (err) {
    if (err.code === "auth/popup-blocked" ||
        err.code === "auth/operation-not-supported-in-this-environment") {
      await fb.A.signInWithRedirect(fb.auth, provider);
      return;
    }
    throw err;
  }
}

/** Call once at startup. Completes a redirect-based sign-in, if one happened. */
export async function finishRedirectSignIn(fb) {
  try {
    await fb.A.getRedirectResult(fb.auth);
  } catch (err) {
    return err; // main.js shows it on the sign-in screen
  }
  return null;
}

export function signOutUser(fb) {
  return fb.A.signOut(fb.auth);
}

/** Turns Firebase error codes into plain-English messages. Returns "" to stay silent. */
export function friendlyAuthError(err) {
  switch (err && err.code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return ""; // you simply closed the window; not an error worth showing
    case "auth/network-request-failed":
      return "No internet connection. You need to be online for the first sign-in.";
    case "auth/unauthorized-domain":
      return "This website address is not allowed yet. In Firebase: Authentication, Settings, Authorized domains, add your GitHub Pages address (README, Part A step 4).";
    case "auth/operation-not-allowed":
      return "Google sign-in is not turned on yet. In Firebase: Authentication, Sign-in method, enable Google.";
    default:
      return "Sign-in failed" + (err && err.code ? ` (${err.code})` : "") + ". Please try again.";
  }
}

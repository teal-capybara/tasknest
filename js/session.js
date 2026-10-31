/* ==========================================================================
   SESSION: a tiny shared object so screens can ask main.js to do things that
   belong to the whole app, like signing out.
   ========================================================================== */

export const session = {
  requestSignOut: () => {},   // main.js replaces this with the real sign-out dialog
};

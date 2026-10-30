# TaskNest (Phase 1: Foundation)

A personal school and organization task tracker that installs on your phone and works offline.

**This is Phase 1 of 5.** It gives you the foundation: Google sign-in, offline storage, a sync-status indicator, an installable app, and the four themes. The task features (courses, task cards, filters, views, reports) arrive in the next phases.

Cost: ₱0. No credit card is needed for anything below.

---

## What is in this folder

```
index.html              The one page of the app (all screens live inside it)
manifest.webmanifest    Tells Android how to install the app (name, icon, colors)
service-worker.js       Saves the app files so it opens with no internet
firestore.rules         Database security rules (step 1)
firestore.rules.locked  Database security rules (step 2: only YOUR account)
css/
  themes.css            The four color themes. Edit colors here
  base.css              Fonts, resets, focus outlines
  layout.css            Page structure (header, grid)
  components.css        Buttons, cards, sync chip, dialogs
js/
  config.js             YOUR Firebase values go here (the only file you must edit)
  main.js               Starts the app and connects everything
  firebase.js           Loads Firebase and turns on offline storage
  auth.js               Google sign-in / sign-out
  sync-status.js        The "Synced / Waiting to sync / Offline" chip
  theme.js              Theme list and switching
  db/settings.js        Saves your settings (theme) to the database
  db/syncTest.js        The little counter used to test offline. Safe to delete later
  ui/                   Small helpers for screens, the theme picker, install button
icons/                  Original app icon (SVG + PNG sizes)
```

Technologies: plain HTML, CSS and JavaScript (no build step, nothing to install), Firebase Authentication and Cloud Firestore (free "Spark" plan), GitHub Pages for hosting. The Firebase code is loaded from Google's CDN.

---

## Part A: One-time setup in Firebase (about 15 minutes)

You need a Google account and a browser.

1. **Create a project.** Go to <https://console.firebase.google.com>, click **Create a project**, name it (for example `tasknest-yourname`). When asked about Google Analytics, turn it **off** (you do not need it). Click Create.
2. **Stay on the free plan.** Never click "Upgrade", and never add a card. If any step asks for a credit card, **stop and tell me**.
3. **Register the web app and copy its values.**
   - On the project home page click the **`</>`** (Web) icon.
   - Nickname: `TaskNest`. Leave "Firebase Hosting" **unchecked**. Click **Register app**.
   - You will see a block of code with `const firebaseConfig = { apiKey: ..., authDomain: ..., ... }`.
   - Open `js/config.js` and replace each `PASTE_...` value with the matching value. Keep the quotes.
   - These values are not secrets. They are meant to be public.
4. **Turn on Google sign-in.**
   - Left menu: **Build, then Authentication, then Get started**.
   - **Sign-in method** tab, click **Google**, switch **Enable** on, choose your email as the support email, **Save**.
   - Open **Settings, then Authorized domains**, click **Add domain**, and enter `YOURUSERNAME.github.io` (your GitHub username, no `https://`, no slash, no repo name). You can add this after Part B once you know your username.
5. **Create the database.**
   - Left menu: **Build, then Firestore Database, then Create database**.
   - Choose the **Standard** edition if asked.
   - Database ID: leave it as **(default)**. Only the default database gets the free quota.
   - Location: **asia-southeast1 (Singapore)**. **This cannot be changed later.**
   - Mode: **Production mode**. Click Create.
6. **Add the security rules.**
   - In Firestore, open the **Rules** tab.
   - Delete everything there, paste the contents of `firestore.rules`, then click **Publish**.

## Part B: Put the app on GitHub Pages (about 10 minutes)

1. On <https://github.com>, click **New repository**. Name it (for example `tasknest`), choose **Public**, and click **Create repository**.
2. Click **uploading an existing file**. Drag in everything from this folder **including the `css`, `js` and `icons` folders** (drag the folders themselves). Make sure `js/config.js` already has your Firebase values. Click **Commit changes**.
3. Go to **Settings, then Pages**. Under **Build and deployment**, set Source to **Deploy from a branch**, Branch **main**, folder **/ (root)**, and Save.
4. Wait a minute or two. Your app will be at `https://YOURUSERNAME.github.io/REPO-NAME/`.
5. Go back to Part A step 4 and make sure `YOURUSERNAME.github.io` is in the authorized domains.

## Part C: Lock the database to your account only

Do this right after your first sign-in.

1. Open the app, sign in, and tap **Copy** next to **Account ID**.
2. Open `firestore.rules.locked`, replace `PASTE_YOUR_ACCOUNT_ID_HERE` with your ID (keep the quotes).
3. Paste the whole file into Firebase, then Firestore Database, then Rules, and **Publish**.
4. Reload the app. It should still work. Anyone else who signs in is refused.

---

## Phase 1 test checklist (do this on your Android phone)

1. Open your app URL in Chrome and sign in with Google.
2. Tap **Add 1 to counter**. The top chip should say **Synced**.
3. Choose a different theme. Close the tab, reopen: the theme should stay.
4. Open Chrome's ⋮ menu and choose **Install app** (or use the Install button in the app). Open it from your home screen.
5. Turn on **airplane mode**. Open the installed app. It should still open and show your data, and the chip should say **Offline**.
6. Tap **Add 1 to counter** twice. The number should go up.
7. Turn airplane mode off and keep the app open. The chip should go **Waiting to sync**, then **Synced**.
8. Optional: open the app on a laptop and check that the counter and theme match.

If any step behaves differently, tell me the step number and what you saw.

---

## How offline storage and sync work

- **Local first.** The app reads and writes to a copy of your data stored in the browser on your device. That copy is why everything is fast and works offline.
- **Queue.** When you change something offline, Firestore keeps the change in that local copy and remembers it still has to be uploaded. When the connection returns, it sends the changes automatically.
- **Status chip.**
  - **Synced**: everything is confirmed by the cloud.
  - **Waiting to sync**: saved on this device, not yet uploaded.
  - **Offline**: no connection. Changes are saved on this device.
  - **Connecting…**: showing the device copy while checking the cloud.
  - **Sync problem**: the database refused or failed a request.
- **Same item edited on two devices:** Firestore saves only the fields you changed. Two devices only clash if they change the *same field*, and then the update that reaches the server last wins. That means an old offline edit can overwrite a newer edit from another device if it uploads later. For one person this is rare.
- **Uploads happen when you open the app with internet.** Android does not reliably upload in the background for web apps. If you make changes offline, open the app once online and give it a moment.
- **Signing in offline.** You sign in once, online. After that the app remembers you and opens without a login, even offline. If the session ever expires you will need internet to sign in again.
- **If browser storage is cleared** (for example "Clear site data" in Chrome) the device copy is deleted. Anything already **Synced** is safe in the cloud. Changes still **Waiting to sync** are lost.
- **Lost phone:** sign in on a new device and your data comes back. You can remove the old device from your Google account's security page.
- **Sign out:** the dialog can also remove the saved copy from the device (use this on shared phones).
- **Backups:** the Export / Import feature arrives in Phase 4.

## Updating the app

Whenever you change any app file:

1. Open `service-worker.js` and change `const VERSION = "v1-phase1";` to a new value (`"v2"`, `"v3"`, and so on).
2. Upload the changed files to GitHub.
3. Open the app online. A **"A new version is ready. Reload"** banner appears. Tap **Reload**.

If you add a new file, also add it to the `SHELL_FILES` list in `service-worker.js`.

## Where to change common things

| I want to change | Edit |
|---|---|
| Colors of a theme | `css/themes.css` |
| Add a fifth theme | A new block in `css/themes.css` plus an entry in `js/theme.js` |
| App name | `js/config.js` (`APP_NAME`), `manifest.webmanifest`, and the `<title>` / brand text in `index.html` |
| Icon | `icons/icon.svg` (then re-export the PNGs) |
| Firebase connection | `js/config.js` |
| Who can use the database | Firebase Rules (`firestore.rules.locked`) |

## Troubleshooting

| What you see | Likely cause and fix |
|---|---|
| "Almost there" screen | `js/config.js` still has `PASTE_...` values. Fill them in and upload again |
| "This website address is not allowed yet" | Add `YOURUSERNAME.github.io` under Authentication, Settings, Authorized domains |
| "Google sign-in is not turned on yet" | Authentication, Sign-in method, enable Google |
| Sign-in popup closes or nothing happens | Allow popups for the site in Chrome. The app falls back to a redirect if popups are blocked |
| "Sync problem" chip | Usually the Firestore rules. Check they are published, and that your Account ID in the locked rules is correct. Make sure you are signed in with the same Google account |
| "Couldn't start the app" | You opened it offline on a device that has never opened it online. Connect once and try again |
| Changes to the code don't show up | You didn't bump `VERSION` in `service-worker.js`, or you haven't tapped the Reload banner |
| Blank page on GitHub Pages | Check you uploaded the folders (`css`, `js`, `icons`), not just the files inside them |
| App stops saving late in the month | You may have hit a free daily limit. The limits are very high for one person, and they reset daily |

## Running it on your computer (optional)

Browsers will not run ES modules from a double-clicked file, so you need a tiny local server. If you have Python: open a terminal in this folder and run `python -m http.server 8000`, then visit <http://localhost:8000>. Sign-in works on `localhost` because Firebase authorizes it by default.

## Free-plan limits (checked October 2026 against Google's documentation)

Firestore free quota: 1 GiB stored, 50,000 reads, 20,000 writes and 20,000 deletes per day (reset around midnight Pacific time), 10 GiB outbound transfer per month. Only the `(default)` database is covered. Phone authentication and Cloud Functions are not on the free plan, and this app uses neither. Free-tier terms can change, so recheck before big changes.

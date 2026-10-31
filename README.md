# TaskNest (Phase 2: Tasks)

A personal school and organization task tracker that installs on your phone and works offline.

**This is Phase 2 of 5.**

| Phase | What you get | Status |
|---|---|---|
| 1 | Installable app, Google sign-in, offline storage, sync chip, four themes | Done |
| 2 | Courses, task types, Add/Edit/Duplicate task, task cards, inline status, urgency sorting, filters, search, archive/delete, task pages, Academics + Organizations | **This version** |
| 3 | Dashboard, Calendar, Board view, adjustable urgency settings | Next |
| 4 | Reports, export/import backup, optional start date, polish | Later |
| 5 | Recurring tasks | Later |

Cost: ₱0. No credit card is needed for anything below.

---

## What is in this folder

```
index.html              The one page of the app (all screens are drawn inside it)
manifest.webmanifest    Tells Android how to install the app (name, icon, colors)
service-worker.js       Saves the app files so it opens with no internet
firestore.rules         Database security rules (step 1)
firestore.rules.locked  Database security rules (step 2: only YOUR account)
css/
  themes.css            The four color themes. Edit colors here
  base.css  layout.css  components.css  views.css     Look and layout
js/
  config.js             YOUR Firebase values (the only file you must edit)
  constants.js          Organizations, built-in task types, statuses, defaults
  main.js               Starts the app; the list of screens (ROUTES) lives here
  router.js             Shows the right screen for the address (#/tasks, #/task/ID ...)
  state.js              The app's in-memory copy of your data
  data.js               Starts the database listeners after sign-in
  firebase.js  auth.js  Firebase startup (with offline storage) and Google sign-in
  sync-status.js        The "Synced / Waiting to sync / Offline" chip
  theme.js  session.js  Theme list; tiny shared helper
  db/                   Everything that reads/writes the database
    courses.js  taskTypes.js  tasks.js  settings.js  helpers.js  syncTest.js
  logic/                Pure rules, no screens: urgency.js, filters.js, validate.js,
                        timing.js (early/on time/late), format.js (dates)
  ui/                   Reusable pieces: dom.js, dialogs.js, taskCard.js, taskActions.js ...
  views/                One file per screen: tasksView, taskFormView, taskDetailView,
                        manageView, settingsView
icons/                  Original app icon (SVG + PNG sizes)
```

Technologies: plain HTML, CSS and JavaScript (no build step, nothing to install), Firebase Authentication and Cloud Firestore (free "Spark" plan), GitHub Pages for hosting. The Firebase code is loaded from Google's CDN.

---

## Upgrading an existing Phase 1 site to Phase 2

You already have the repo, Firebase and GitHub Pages set up. You only replace the files.

1. Unzip `tasknest-phase2.zip`. **It does not contain `js/config.js`, on purpose.** Your repo already has your Firebase values in it, and this keeps them safe from being overwritten. Do not upload or create a new `config.js`.
2. On GitHub, open your `tasknest` repo, click **Add file, then Upload files**.
3. Drag in **everything inside the unzipped `tasknest` folder** (the `css`, `js`, `icons` folders and the loose files). GitHub replaces files with the same name and adds the new ones. Commit changes.
4. Wait about a minute. Open the app. A banner **"A new version is ready. Reload"** appears; tap **Reload**.
5. No Firebase changes are needed. Your database rules already cover the new data.

If you ever see old behavior, close the app completely and reopen it, or bump `VERSION` in `service-worker.js` (see "Updating the app" below).

## Starting from scratch (only if you do not have Phase 1 yet)

This zip has no `config.js`, so first add one. Create `js/config.js` using the copy in the Phase 1 zip, paste your Firebase values (Part A step 3 below), then continue with Parts A to C.

---

## Part A: One-time setup in Firebase (about 15 minutes)

1. **Create a project.** <https://console.firebase.google.com>, **Create a project**, turn Google Analytics **off**.
2. **Stay on the free plan.** Never click "Upgrade" or add a card. If anything asks for a card, stop.
3. **Register the web app.** On the project home click **+ Add app**, choose **Web** (`</>`), nickname `TaskNest`, leave Hosting unchecked, **Register app**. Copy the six `firebaseConfig` values into `js/config.js`. They are not secrets.
4. **Turn on Google sign-in.** **Security, then Authentication, then Get started, then Sign-in method, then Google, Enable, Save.** Then **Settings, Authorized domains, Add domain**: `YOURUSERNAME.github.io`.
5. **Create the database.** **Databases and storage, then Firestore, then Create database.** Standard edition, ID `(default)`, a nearby location (Singapore or Bangkok), **Production mode**. Leave scheduled backups **unchecked** (they need a paid plan).
6. **Rules.** Firestore, **Rules** tab: delete everything, paste `firestore.rules`, **Publish**.

## Part B: GitHub Pages

New **public** repository, upload the files (including the `css`, `js`, `icons` folders), then **Settings, Pages, Deploy from a branch, main, / (root)**. Your app is at `https://YOURUSERNAME.github.io/REPO-NAME/`.

## Part C: Lock the database to your account

1. Sign in, then open **Settings** in the app and tap **Copy** next to Account ID.
2. Put it in `firestore.rules.locked` (replace `PASTE_YOUR_ACCOUNT_ID_HERE`, keep quotes).
3. In Firebase Rules, **replace** everything with that file and **Publish**. (You do not need to upload the edited file to GitHub.)

---

## Using the app

**Navigation.** Phone: bottom bar (Tasks, Manage, Settings) and the **Add task** button. Computer: the sidebar.

**First time:**
1. **Manage**, add your courses (for example `CS 101`). Add any custom task types you want.
2. Tap **Add task**.

**Add task.** Title, workspace (Academics or Organizations), course or organization, task type, Individual or Group work, due date and time, status, instructions, personal notes.
- A date without a time becomes **11:59 PM**. Leave the date empty for a task with no deadline.
- Nothing is saved if something is missing or invalid; the form shows what to fix.
- If you opened Add task while looking at a course or organization, it is pre-selected.

**Task cards.** Each card shows the course or organization, type, Individual/Group, due date and time, an urgency badge (icon plus words), and a short preview. Without opening the task you can:
- tick the round box to mark it **Done** (untick to bring it back),
- use the dropdown to switch between Not started, In progress and Done,
- open the **⋯** menu for Edit, Duplicate, Archive, Delete.

**Urgency vs. status** are separate. Status is what you say (Not started, In progress, Done). Urgency is how close the deadline is: **Overdue, Due today, Due soon (within 48 hours), Upcoming, No deadline**. A task can be In progress and Overdue at once.

**Default order:** unfinished tasks with a deadline, soonest first (so overdue, then today, then tomorrow ...), then tasks without a deadline, then finished tasks at the bottom. You can also sort by due date, recently added, or title.

**Filters and search.** Workspace tabs (All, Academics, Organizations), a search box (title, course, organization, type, instructions, notes), and the Filters panel: course, organization, task type, Individual/Group, status, deadline (due today, next 7 days, upcoming, overdue, unfinished, completed, no deadline) and "Show archived". They all combine.

**Task page.** Tap a title. Each task has its own address (`#/task/ID`) you can bookmark. It shows the full instructions, notes, timeline, whether it was finished early, on time or late, and the **deadline history**.

**Archive vs. delete.**
- **Archive** hides a task (or a course and all its tasks) but keeps everything. Show it again with Filters, **Show archived**. Reports in Phase 4 will include archived tasks.
- **Delete** is permanent and always asks first, saying what will be lost. Deleting a course also deletes its tasks and tells you the exact number first.
- Deleting one of your custom task types asks where to move its tasks, so no task is left without a type.

**Early / on time / late** is worked out from when you pressed Done and the deadline. "Early" means at least 24 hours before it. **It says when you finished, not when you started.** The first time a task becomes In progress is also recorded ("First marked In progress"), which is a real signal of when work began; the creation date is not.

---

## How your data is stored

Everything lives under your account: `users/{your-id}/...`

| Collection | What is in a document |
|---|---|
| `courses` | name, archived, createdAt, updatedAt |
| `taskTypes` | your custom types only: name, createdAt, updatedAt |
| `tasks` | title, workspace, courseId or orgId, typeId, arrangement, status, dueAt, instructions, notes, createdAt, updatedAt, inProgressAt, completedAt, archived, archivedAt, deadlineHistory |
| `settings/main` | theme (more in Phase 3) |
| `meta/syncTest` | the little counter on the Settings page. Safe to ignore |

- Tasks point to courses and types by **id**, not name, so renaming a course or type updates every task.
- The five built-in task types live in `js/constants.js`, not the database, and cannot be deleted.
- All times are numbers (milliseconds since 1970) from your device clock, in your own time zone.

## How offline storage and sync work

- **Local first.** The app reads and writes a copy of your data stored in the browser. That copy is why it is fast and works offline.
- **Queue.** Offline changes are kept in that copy and uploaded automatically when the connection returns.
- **Status chip.** **Synced** (cloud confirmed), **Waiting to sync** (saved here, not uploaded), **Offline · saved** (offline, and your last change is kept on this device), **Offline**, **Connecting…**, **Sync problem**.
- **Same field edited on two devices:** Firestore saves only the fields you changed. Two devices only clash if they change the *same field*, and then the change that reaches the server last wins. An old offline edit can overwrite a newer edit from another device if it uploads later.
- **Uploads happen when you open the app with internet.** Android does not reliably upload web apps in the background.
- **Signing in offline.** Sign in once, online. After that the app opens offline without a login. If the session expires you need internet to sign in again.
- **If browser storage is cleared**, the device copy is deleted. Anything already **Synced** is safe. Changes still **Waiting to sync** are lost.
- **Lost phone:** sign in on a new device and your data comes back.
- **Backups:** Export / Import arrives in Phase 4.

## Updating the app

Whenever you change any app file:

1. Open `service-worker.js` and change `const VERSION = "v2-phase2";` to a new value (`"v3"`, `"v4"` ...).
2. Upload the changed files to GitHub.
3. Open the app online. Tap **Reload** on the banner.

If you add a new file, also add it to `SHELL_FILES` in `service-worker.js`.

## Where to change common things

| I want to change | Edit |
|---|---|
| Add or rename an organization | `ORGS` in `js/constants.js` (never change an existing `id`) |
| Built-in task types | `DEFAULT_TYPES` in `js/constants.js` |
| "Due soon" window (48 h) / "early" window (24 h) | `DEFAULT_SETTINGS` in `js/constants.js` (a Settings screen for these comes in Phase 3) |
| Default time when you pick only a date | `DEFAULT_DUE_TIME` in `js/constants.js` |
| Colors of a theme | `css/themes.css` |
| What the urgency labels say | `js/logic/urgency.js` |
| What counts as a filter match | `js/logic/filters.js` |
| Form rules / error messages | `js/logic/validate.js` |
| Fields on a task | `js/db/tasks.js`, `js/logic/validate.js`, `js/views/taskFormView.js`, `js/views/taskDetailView.js` |

## Troubleshooting

| What you see | Likely cause and fix |
|---|---|
| "Almost there" screen | `js/config.js` still has `PASTE_...` values |
| "This website address is not allowed yet" | Add `YOURUSERNAME.github.io` under Authentication, Settings, Authorized domains |
| Spinner that never ends, then "Still loading…" | The database rules are not published, or the Account ID in the locked rules is wrong. Check Part C |
| "Sync problem" chip | Same as above. Make sure you sign in with the same Google account |
| "Could not save: permission-denied" | The rules refuse your account. Recheck Part C |
| Changes to the code don't show up | You didn't bump `VERSION`, or you haven't tapped Reload |
| Blank page on GitHub Pages | You uploaded the `tasknest` folder itself instead of what is inside it |
| After the update, sign-in screen asks for Firebase values | `config.js` was overwritten with the placeholder. Paste your values in again |
| A course or type shows "Unknown" | It was deleted on another device and this one has not synced yet |

## Free-plan limits (checked October 2026 against Google's documentation)

Firestore free quota: 1 GiB stored, 50,000 reads, 20,000 writes and 20,000 deletes per day (reset around midnight Pacific time), 10 GiB outbound transfer per month. Only the `(default)` database is covered. Free-tier terms can change, so recheck before big changes. The app reads your tasks from the device copy first; a normal day of use is far below these numbers.

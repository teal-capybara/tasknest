# TaskNest (Phase 6: Class schedule and courses)

A personal school and organization task tracker that installs on your phone and works offline.

**This is Phase 6: school years and semesters, full course details, the Class Schedule and Courses pages, and a class card on Home. (Phase 5, recurring tasks, is skipped for now.)**

| Phase | What you get | Status |
|---|---|---|
| 1 | Installable app, Google sign-in, offline storage, sync chip, four themes | Done |
| 2 | Courses, task types, Add/Edit/Duplicate task, task cards, inline status, urgency sorting, filters, search, archive/delete, task pages, Academics + Organizations | Done |
| 2.5 | Task types per workspace, form drafts that survive leaving the page, no floating Add button on the form, Settings as a list, Archived tasks in Settings, "Due soon" wording | Done |
| 3a | Four new themes (Sakura Mist, Velvet Dusk, Rosé Eclipse, Abyssal Tide) | Done |
| 3b | New app icon, Home dashboard, choose your start screen | Done |
| 3c | Calendar (month, week, day) with schedule events (exams, meetings, classes), "Create review task" | Done |
| 3.5 | Heart/flower calendar markers, "Add event" button on the Calendar, redesigned Home (greeting card, small counters, clear sections, Academics and Organizations progress apart), event types per workspace with your own, Manage in collapsible groups, capybara decorations | Done |
| 3.6 | Floating pill navigation on phones, collapsible sidebar on desktop, shorter 2x2 Home tiles, tap a day for a floating window, desktop Calendar with side panels, secret capybara diary (one private note per day) | Done |
| 3.7 | Your exact capybara poses and icons (cut out of your artwork, in `icons/art` and `icons/ui`), icon colors that follow the theme (the capybaras never change), Calendar redesigned like your mock-up (cloud banner, pill switches, Today / Upcoming / quote cards, week at a glance) | Done |
| 3d | Board view: your tasks as Not started / In progress / Done columns, move with buttons or drag, filters | Done |
| 4a | Backup (download / restore a file), mood picker beside the diary, floating Add pill on desktop | Done |
| 4b | Reports: finished over time, early / on time / late, by course and type, events, CSV download | Done |
| 4c | Optional start date on tasks; accessibility polish (skip link, focus moves to the new page, bigger tap targets) | Done |
| 6 | Class schedule: school year + semester, course details, Schedule and Courses pages, Home class card | **This version** (temporary icons) |
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
  themes.css            The eight color themes. Edit colors here
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
    courses.js  taskTypes.js  tasks.js  events.js  settings.js  helpers.js  syncTest.js
  logic/                Pure rules, no screens: urgency.js, filters.js, validate.js,
                        timing.js (early/on time/late), format.js (dates),
                        drafts.js (saves the half-filled task form),
                        stats.js (the Dashboard's numbers),
                        calendar.js (dates, month grids, what is on each day)
  ui/                   Reusable pieces: dom.js, dialogs.js, taskCard.js, taskActions.js ...
  views/                One file per screen: dashboardView, calendarView, eventFormView, eventDetailView, tasksView, taskFormView, taskDetailView,
                        manageView, settingsView (the Settings list and all its pages)
icons/                  The app icon (tasknest-*.png: browser tab, home screen, Android adaptive, iPhone)
```

Technologies: plain HTML, CSS and JavaScript (no build step, nothing to install), Firebase Authentication and Cloud Firestore (free "Spark" plan), GitHub Pages for hosting. The Firebase code is loaded from Google's CDN.

---

## Upgrading an existing site to Phase 2.5

You already have the repo, Firebase and GitHub Pages set up. You only replace the files.

1. Unzip `tasknest-phase2.5.zip`. **It does not contain `js/config.js`, on purpose.** Your repo already has your Firebase values in it, and this keeps them safe from being overwritten. Do not upload or create a new `config.js`.
2. On GitHub, open your `tasknest` repo, click **Add file, then Upload files**.
3. Drag in **everything inside the unzipped `tasknest` folder** (the `css`, `js`, `icons` folders and the loose files). GitHub replaces files with the same name and adds the new ones. Commit changes.
4. Wait about a minute. Open the app. A banner **"A new version is ready. Reload"** appears; tap **Reload**.
5. No Firebase changes are needed. Your database rules already cover the new data.
6. Your existing tasks, courses and custom task types keep working. Custom types you made before this version count as **Academics** types. An Organizations task that still has an Academics type (for example "Project") keeps showing it, and asks you to pick an Organizations type the next time you edit it.

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

**Semesters (Phase 6).** The Schedule and Courses pages have a school year and semester picker (*＋ Add school year* adds the next year). Choosing a semester gives a clean slate: you see only that semester's courses, schedule and academic tasks (on Tasks, Board, Home, Reports and Archived tasks, and in the course pickers). Organization tasks are not tied to a semester, and the Calendar always shows everything. Courses you made before this feature count as 2026–2027, 1st semester. Nothing is deleted when you switch.

**Courses.** Add a course from the Courses page: course description (the name used everywhere), course code, lecture or laboratory, units, professor, room, semester, and its class times (add one line per day). Only the Courses and Schedule pages show the details; everywhere else a course is just its description. Edit a course to archive or delete it. A gentle heads-up appears if class times overlap; it never blocks saving. *Manage* (task types and event types) is now under Settings.

**Schedule.** On a phone: a list of your class days with each course, professor, room and time. On a computer: a weekly timetable. On Home, the class card shows today's classes until your last class has ended, then tomorrow's (or "No classes tomorrow").

**Start date (optional).** The task form has a *Start date* above the deadline: the day you plan to begin. Leave it empty if it doesn't matter (the **Clear start date** button removes it). It can't be after the deadline. While the start date is still ahead, the task shows a *Starts Mon, Nov 9* chip on the list and Board. The detail page and the CSV show it too, and it is part of backups. It changes nothing else: the task still appears in your lists, and urgency still follows the deadline.

**Which version is running?** Settings shows the version at the bottom. If it shows two different names (files vs offline copy), some files from the zip weren't uploaded, or the app needs a reload.

**Accessibility.** A *Skip to content* link appears when you press Tab. When you open a page, keyboard and screen-reader focus moves to its heading. Buttons and tabs are at least 44 px tall. Colors were checked for readable contrast in all eight themes. Status and urgency always use an icon or words, never only color.

**Reports.** On Home, under *Last 7 days*, tap **See full reports** (or go to `#/reports`). Pick a period (7, 30, 90 days or all time) and a workspace. You get: tasks finished and added, the share finished on time or early, average days from adding a task to finishing it, a bar chart of tasks finished over time (daily for 7 days, weekly otherwise), early / on time / late, finished per course or organization, finished per task type, and events that happened. *Download tasks (CSV)* saves every task as a spreadsheet. Reports include archived tasks. Early / on time / late uses each task's current deadline, so moving a deadline after finishing changes the result.

**Mood.** In a day's window, next to the capybara, there is a face button. Tap it and pick how you felt that day from 12 moods (ecstatic, happy, confident, grateful, calm, okay, tired, anxious, stressed, sad, depressed, angry). It saves straight away, and tapping the same mood again clears it. Like the diary, it is private: it is saved in that day's entry and only shows in that day's window.

**Backup.** Settings, then Backup. *Download backup* saves one file (`tasknest-backup-DATE.json`) with your courses, tasks, events, your own task and event types, and your settings. Your diary and moods are not included. To restore, choose a backup file: you see what is inside, then pick **Add to what I have** (nothing is deleted; same items are updated) or **Replace everything** (anything not in the file is deleted, after a confirmation). Keep a backup now and then, for example before a big change.

**Add button on desktop.** The round Add pill is at the lower right on computers too, and says "Add event" on the Calendar.

**Board.** On the Tasks screen, switch from **List** to **Board** (top right). Your tasks sit in three columns: **Not started**, **In progress** and **Done**. On a phone, swipe sideways between columns. Move a task with the buttons on its card (**Start**, **Done**, **Back**, **Reopen**), or on a computer drag the card to another column. Moving a card is exactly the same as changing its status on the list, so the dates recorded for it stay correct. Use the tabs, the course or organization menu and the search box to narrow it down. Archived tasks are not shown. The Done column shows the last 14 days; press **Show all done** for older ones.

**Home (dashboard).** The app opens here (you can change that under Settings, View). It shows a greeting, then four tiles: **Overdue**, **Due today**, **Due soon** and **In progress**. Tap a tile to open the Tasks list showing exactly those tasks. Under the tiles:
- **Needs attention**: your most urgent tasks (up to 5; overdue first, then today, then soon). You can tick them off or change their status right there.
- **Progress**: for each course and organization, how many of its tasks are done.
- **Last 7 days**: how many tasks you finished, and whether early, on time or late.

Archived tasks are never counted. "Due today" means a deadline later today; a deadline that already passed today counts as overdue.

**Calendar.** Open it from the bottom bar (Calendar). It shows your **schedule events** and your **task deadlines** together.
- **Month**: a grid of the month. Each day shows small shapes: a diamond ◆ for an event (red for an exam) and a circle ● for a task deadline. Tap a day and everything on it is listed under the grid.
- **Week**: the 7 days with everything listed. **Day**: one day. Use the arrows to move and **Today** to jump back. The view you last used is remembered while the app is open.
- Tasks without a deadline, and archived tasks, are not on the calendar. Finished tasks show crossed out with "Task done".
- Tap anything in the list to open it.

**Events** are things you attend: an exam, a meeting, a class, anything else. An event is **not** a task. Tap **Add event** (on the Calendar), fill in the title, kind (Exam, Meeting, Class, Other), workspace, optional course or organization, the date, the start and end time (or tick **All day**), and an optional location and notes. Events last one day. Like the task form, the event form keeps your entries if you leave it.
- **Create review task**: on an exam's page this opens the Add task form already filled in: "Review for Midterm", the same course, type Exam, and a deadline the day before the exam (or today if the exam is today or tomorrow). For other events the button says "Create task for this event" and the title starts with "Prepare for". The task stays linked: it is listed on the event's page, and the task's page links back to the event.
- On **Home**, **Coming up** lists your events in the next 14 days. An exam that has no task yet shows an **Add review task** shortcut.
- Deleting an event never deletes its tasks. Deleting a course never deletes its events (they stay on the calendar, without a course).

**Navigation.** Phone: bottom bar (Home, Tasks, Calendar, Manage, Settings) and the **Add task** button (it hides itself on the Add/Edit form, where it would only be in the way). Computer: the sidebar.

**First time:**
1. **Manage**, add your courses (for example `CS 101`). Add any custom task types you want, in the Academics list or the Organizations list.
2. Tap **Add task**.

**Add task.** Title, workspace (Academics or Organizations), course or organization, task type, Individual or Group work, due date and time, status, instructions, personal notes.
- **Task types follow the workspace.** Academics offers Project, Assignment, Exam, Quiz, Recitation. Organizations offers Meeting, Event prep, Script writing, Content creation, Other. Your own types (Manage) are added to one workspace or the other. Changing the workspace clears a type that doesn't belong to the new one.
- **Your entries are kept.** If you leave the form (say you tap Settings by accident, or close the app), everything you typed is still there when you open it again. Tap **Add task** (or **Continue** on the Tasks list banner). A note says "Your unsaved entries were restored" and offers **Start over**. The draft is removed when you save, press **Cancel**, or tap **Start over**. Drafts stay on this device only (not synced). Editing a task has its own separate draft.
- A date without a time becomes **11:59 PM**. Leave the date empty for a task with no deadline.
- Nothing is saved if something is missing or invalid; the form shows what to fix.
- If you opened Add task while looking at a course or organization, it is pre-selected.

**Task cards.** Each card shows the course or organization, type, Individual/Group, due date and time, an urgency badge (icon plus words), and a short preview. Without opening the task you can:
- tick the round box to mark it **Done** (untick to bring it back),
- use the dropdown to switch between Not started, In progress and Done,
- open the **⋯** menu for Edit, Duplicate, Archive, Delete.

**Urgency vs. status** are separate. Status is what you say (Not started, In progress, Done). Urgency is how close the deadline is: **Overdue, Due today, Due soon (not today, but within 48 hours; the card also shows the exact date), Upcoming, No deadline**. You can change the 48 hours under Settings, View. A task can be In progress and Overdue at once.

**Default order:** unfinished tasks with a deadline, soonest first (so overdue, then today, then tomorrow ...), then tasks without a deadline, then finished tasks at the bottom. You can also sort by due date, recently added, or title.

**Filters and search.** Workspace tabs (All, Academics, Organizations), a search box (title, course, organization, type, instructions, notes), and the Filters panel: course, organization, task type (only the types of the tab you are on), Individual/Group, status, and deadline (due today, next 7 days, upcoming, overdue, unfinished, completed, no deadline). They all combine.

**Task page.** Tap a title. Each task has its own address (`#/task/ID`) you can bookmark. It shows the full instructions, notes, timeline, whether it was finished early, on time or late, and the **deadline history**.

**Archive vs. delete.**
- **Archive** hides a task (or a course and all its tasks) but keeps everything. Archived tasks are listed under **Settings, Archived tasks**, where you can restore or delete them. Tasks hidden because their course is archived come back when you restore the course (Manage, Show archived courses). Reports in Phase 4 will include archived tasks.
- **Delete** is permanent and always asks first, saying what will be lost. Deleting a course also deletes its tasks and tells you the exact number first.
- Deleting one of your custom task types asks where to move its tasks, so no task is left without a type.

**Early / on time / late** is worked out from when you pressed Done and the deadline. "Early" means at least 24 hours before it. **It says when you finished, not when you started.** The first time a task becomes In progress is also recorded ("First marked In progress"), which is a real signal of when work began; the creation date is not.

---

**Settings** is a short list. Tap a word to open its page:

| Word | What is inside |
|---|---|
| Theme | The eight color themes (four light, four dark) |
| Backup | Download a backup file, or restore one (merge or replace) |
| View | The screen the app starts on (Dashboard, Tasks list or Calendar; Board joins later), and the "Due soon" and "Early" windows (hours) |
| Account | Your name, email, Account ID, Sign out |
| Archived tasks | Tasks you archived |
| Install the app | Install on your phone |
| Offline check | The little counter that proves offline saving works |

---

## How your data is stored

Everything lives under your account: `users/{your-id}/...`

| Collection | What is in a document |
|---|---|
| `courses` | name (the course description), code, kind (lecture or laboratory), units, professor, room, termId (for example `2026-2027|1`), slots (day, start, end), archived, createdAt, updatedAt |
| `taskTypes` | your custom types only: name, workspace (`academics` or `organizations`), createdAt, updatedAt |
| `tasks` | title, workspace, courseId or orgId, typeId, arrangement, status, startAt (optional), dueAt, instructions, notes, eventId (optional), createdAt, updatedAt, inProgressAt, completedAt, archived, archivedAt, deadlineHistory |
| `eventTypes` | your custom event types only: name, workspace, createdAt, updatedAt |
| `events` | title, kind (a built-in id such as `exam`, or the id of one of your `eventTypes`), workspace, courseId or orgId (optional), allDay, startAt, endAt (or null), location, notes, createdAt, updatedAt |
| `diary` | one private note and mood per day, document id is the day (for example `2026-11-03`): text, mood, updatedAt. Only ever read one day at a time, from the capybara in the Calendar day window |
| `settings/main` | theme, defaultScreen, dueSoonHours, earlyHours, lastExportAt, termId, schoolYears |
| `meta/syncTest` | the little counter on the Settings page. Safe to ignore |

- Tasks point to courses and types by **id**, not name, so renaming a course or type updates every task.
- The built-in task types (five for Academics, five for Organizations) live in `js/constants.js`, not the database, and cannot be deleted.
- Half-filled forms (drafts) are kept only in this browser, not in the database.
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

1. Open `service-worker.js` and change `const VERSION = "v2.5-phase2-5";` to a new value (`"v3"`, `"v4"` ...).
2. Upload the changed files to GitHub.
3. Open the app online. Tap **Reload** on the banner.

If you add a new file, also add it to `SHELL_FILES` in `service-worker.js`.

## About the pictures

The capybaras are in `icons/art/` and the small icons in `icons/ui/` (all PNG, cut out of the artwork you gave me). The capybaras are never recolored. The teal button icons take the theme's hue through `--icon-hue` in `css/themes.css`. To use a sharper version of a picture, replace the file with one of the same name and bump `VERSION` in `service-worker.js`.

## Where to change common things

| I want to change | Edit |
|---|---|
| Add or rename an organization | `ORGS` in `js/constants.js` (never change an existing `id`) |
| Built-in task types | `ACADEMIC_TYPES` and `ORG_TYPES` in `js/constants.js` (never change an existing `id`) |
| "Due soon" window (48 h) / "early" window (24 h) | Settings, View in the app. The starting values are `DEFAULT_SETTINGS` in `js/constants.js` |
| The Home dashboard numbers / layout | `js/logic/stats.js` (numbers), `js/views/dashboardView.js` (layout) |
| First day of the week on the calendar (Sunday or Monday) | `WEEK_START` in `js/constants.js` |
| Kinds of events (Exam, Meeting ...) | `EVENT_KINDS` in `js/constants.js` (never change an existing `id`) |
| Calendar layout / what each day shows | `js/views/calendarView.js`, `js/logic/calendar.js` |
| Which screens hide the floating Add task button | `hideAdd: true` on the route in `js/main.js` |
| What the Settings list says | `SECTION_ORDER`, `SUMMARY` and `SECTIONS` in `js/views/settingsView.js` |
| Default time when you pick only a date | `DEFAULT_DUE_TIME` in `js/constants.js` |
| Colors of a theme | `css/themes.css` (to add one, also add it to `THEMES` in `js/theme.js`) |
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
| The home-screen icon is still the old one after updating | Android keeps the old icon until the app is reinstalled: remove TaskNest from your home screen, wait a minute, then install it again from the browser menu. The icon files are named `tasknest-*.png`; you can delete any older `icon-*.png`, `apple-touch-icon.png` and `favicon-64.png` files from your repo |
| The form shows old text I didn't expect | It is a saved draft. Tap **Start over** (or **Cancel**) to remove it |
| I can't find my archived task | Settings, Archived tasks. (If its course is archived, restore the course in Manage) |

## Free-plan limits (checked October 2026 against Google's documentation)

Firestore free quota: 1 GiB stored, 50,000 reads, 20,000 writes and 20,000 deletes per day (reset around midnight Pacific time), 10 GiB outbound transfer per month. Only the `(default)` database is covered. Free-tier terms can change, so recheck before big changes. The app reads your tasks from the device copy first; a normal day of use is far below these numbers.

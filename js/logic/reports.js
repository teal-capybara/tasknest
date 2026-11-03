/* ==========================================================================
   REPORTS NUMBERS

   Pure functions (no screens, no database), like stats.js. Unlike the lists and
   the Dashboard, reports INCLUDE archived tasks: archiving keeps a task "in your
   records and reports".

   What the numbers mean (shown on the Reports page too):
   - "Finished" counts tasks whose completedAt falls inside the period.
   - Early / on time / late come from completionTiming() against the CURRENT
     deadline, so a deadline moved after finishing changes the result.
   - "Days to finish" = completedAt minus createdAt.
   - Open / overdue are counted as of now, whatever the period.

   opts = { rangeDays: 7 | 30 | 90 | 0 (0 = all time), workspace: "all" | "academics" | "organizations" }
   ctx  = { now, settings: { earlyHours }, groupName(task), typeName(id), kindName(id) }
   ========================================================================== */

import { completionTiming } from "./timing.js";

const DAY = 24 * 60 * 60 * 1000;
export const RANGES = [
  { days: 7, name: "7 days" }, { days: 30, name: "30 days" }, { days: 90, name: "90 days" }, { days: 0, name: "All time" },
];

const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const inWs = (item, ws) => ws === "all" || item.workspace === ws;

/** Time buckets for the "finished over time" chart. 7 days = one bar per day, otherwise one bar per week. Newest last. */
export function buckets(now, rangeDays) {
  const today = startOfDay(now);
  const list = [];
  if (rangeDays === 7) {
    for (let i = 6; i >= 0; i--) { const from = addDays(today, -i); list.push({ from, to: addDays(from, 1), daily: true }); }
  } else {
    const n = rangeDays === 30 ? 5 : 12;
    // weeks end tomorrow-midnight, so "this week" is the 7 days up to and including today
    for (let i = n - 1; i >= 0; i--) { const to = addDays(today, 1 - i * 7); list.push({ from: addDays(to, -7), to, daily: false }); }
  }
  return list;
}
function addDays(ms, n) { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); }

export function reportStats(tasks, events, ctx, opts) {
  const { now, settings, groupName, typeName, kindName } = ctx;
  const { rangeDays, workspace } = opts;
  const from = rangeDays ? startOfDay(now) - (rangeDays - 1) * DAY : 0;
  const mine = tasks.filter((t) => inWs(t, workspace));

  const finished = mine.filter((t) => t.status === "done" && t.completedAt != null && t.completedAt >= from && t.completedAt <= now);
  const timing = { early: 0, ontime: 0, late: 0, nodeadline: 0 };
  let daySum = 0, dayCount = 0;
  const byGroup = new Map(), byType = new Map();
  for (const t of finished) {
    const tm = completionTiming(t, settings.earlyHours);
    if (tm) timing[tm.key]++;
    if (t.createdAt != null && t.completedAt >= t.createdAt) { daySum += (t.completedAt - t.createdAt) / DAY; dayCount++; }
    const gKey = `${t.workspace}:${t.workspace === "academics" ? t.courseId : t.orgId}`;
    if (!byGroup.has(gKey)) byGroup.set(gKey, { key: gKey, workspace: t.workspace, name: groupName(t), finished: 0, late: 0 });
    const g = byGroup.get(gKey); g.finished++; if (tm && tm.key === "late") g.late++;
    const typeKey = t.typeId || "";
    if (!byType.has(typeKey)) byType.set(typeKey, { id: typeKey, name: typeName(t.typeId), finished: 0 });
    byType.get(typeKey).finished++;
  }
  const judged = timing.early + timing.ontime + timing.late;

  const open = mine.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => t.dueAt != null && t.dueAt < now);
  const created = mine.filter((t) => t.createdAt != null && t.createdAt >= from && t.createdAt <= now).length;

  const series = buckets(now, rangeDays || 90).map((b) => ({
    from: b.from, to: b.to, daily: b.daily,
    count: mine.filter((t) => t.status === "done" && t.completedAt != null && t.completedAt >= b.from && t.completedAt < b.to).length,
  }));

  // Events that already happened (or happen today) in the period.
  const evs = events.filter((e) => inWs(e, workspace) && e.startAt >= from && e.startAt <= startOfDay(now) + DAY - 1);
  const byKind = new Map();
  for (const e of evs) { const k = e.kind || ""; if (!byKind.has(k)) byKind.set(k, { id: k, name: kindName(e.kind), count: 0 }); byKind.get(k).count++; }

  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  return {
    from, finished: finished.length, created, timing, judged,
    onTimeRate: judged ? Math.round(((timing.early + timing.ontime) / judged) * 100) : null,
    avgDays: dayCount ? Math.round((daySum / dayCount) * 10) / 10 : null,
    openCount: open.length, overdueCount: overdue.length,
    groups: [...byGroup.values()].sort((a, b) => b.finished - a.finished || byName(a, b)),
    types: [...byType.values()].sort((a, b) => b.finished - a.finished || byName(a, b)),
    series, eventCount: evs.length,
    kinds: [...byKind.values()].sort((a, b) => b.count - a.count || byName(a, b)),
  };
}

/* ---- CSV: all your tasks as a spreadsheet file ---- */

/** Quotes a cell. A cell that starts with = + - @ would be run as a formula by Excel/Sheets, so it gets a ' in front. */
export function csvCell(value) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function tasksToCsv(tasks, ctx) {
  const date = (ms) => (ms == null ? "" : new Date(ms).toISOString().slice(0, 16).replace("T", " "));
  const head = ["Title", "Workspace", "Course / Organization", "Type", "Status", "Start", "Deadline", "Finished", "Created", "Archived", "Instructions", "Notes"];
  const rows = tasks.map((t) => [
    t.title, t.workspace, ctx.groupName(t), ctx.typeName(t.typeId), t.status,
    date(t.startAt), date(t.dueAt), date(t.completedAt), date(t.createdAt), t.archived ? "yes" : "", t.instructions || "", t.notes || "",
  ]);
  return "\uFEFF" + [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

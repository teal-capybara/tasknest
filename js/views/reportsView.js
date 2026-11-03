/* ==========================================================================
   REPORTS (#/reports): how your work is going over a period.

   Pick a period (7 / 30 / 90 days / all time) and a workspace. Numbers come from
   js/logic/reports.js. Unlike the lists, reports include archived tasks.
   The controls are built once; only the results are redrawn.
   ========================================================================== */

import { h, clear } from "../ui/dom.js";
import { WORKSPACES } from "../constants.js";
import { state, getSettings, taskGroupName, typeName, eventKindName } from "../state.js";
import { reportStats, tasksToCsv, RANGES } from "../logic/reports.js";
import { backupFileName } from "../logic/backup.js";
import { toast } from "../ui/screens.js";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
let rangeDays = 30;          // remembered while you move between screens
let workspace = "all";

export function reportsView(container) {
  const rangeButtons = RANGES.map((r) => h("button", { type: "button", class: "seg-btn", dataset: { days: String(r.days) }, onClick: () => { rangeDays = r.days; render(); } }, r.name));
  const wsButtons = [{ id: "all", name: "All" }, ...WORKSPACES].map((w) => h("button", { type: "button", class: "seg-btn", dataset: { ws: w.id }, onClick: () => { workspace = w.id; render(); } }, w.name));
  const body = h("div", { class: "report-body" });

  container.append(
    h("a", { class: "back-link", href: "#/dashboard" }, "← Home"),
    h("div", { class: "page-head" }, h("h1", {}, "Reports")),
    h("div", { class: "seg", role: "group", "aria-label": "Period" }, rangeButtons),
    h("div", { class: "seg", role: "group", "aria-label": "Workspace" }, wsButtons),
    body);

  function render() {
    for (const b of rangeButtons) b.setAttribute("aria-pressed", String(Number(b.dataset.days) === rangeDays));
    for (const b of wsButtons) b.setAttribute("aria-pressed", String(b.dataset.ws === workspace));

    const now = Date.now();
    const settings = getSettings();
    const r = reportStats(state.tasks, state.events, { now, settings, groupName: taskGroupName, typeName, kindName: eventKindName }, { rangeDays, workspace });
    clear(body);

    if (!state.tasks.length) {
      body.append(h("div", { class: "empty card" }, h("h2", {}, "No data yet"), h("p", { class: "muted" }, "Reports fill in as you add and finish tasks.")));
      return;
    }

    const stat = (value, label) => h("li", { class: "report-stat" }, h("strong", {}, String(value)), h("span", { class: "muted small" }, label));
    const maxSeries = Math.max(1, ...r.series.map((s) => s.count));
    const fmt = (ms, o) => new Date(ms).toLocaleDateString([], o);

    const timingRow = (label, n) => h("li", { class: "report-row" },
      h("span", {}, label),
      h("div", { class: "bar", role: "img", "aria-label": `${label}: ${n} of ${r.judged || r.finished}` },
        h("span", { class: "bar-fill", style: `width: ${r.finished ? Math.round((n / r.finished) * 100) : 0}%` })),
      h("strong", { class: "report-num" }, String(n)));

    // (append(null) would print the word "null", so sections with nothing to show are filtered out)
    body.append(...[
      h("section", { class: "card" },
        h("ul", { class: "report-stats" },
          stat(r.finished, "finished"), stat(r.created, "added"),
          stat(r.onTimeRate == null ? "–" : `${r.onTimeRate}%`, "on time or early"),
          stat(r.avgDays == null ? "–" : r.avgDays, "avg days to finish")),
        h("p", { class: "muted small" }, `Right now: ${plural(r.openCount, "open task")}, ${r.overdueCount} overdue.`)),

      h("section", { class: "card" }, h("h2", {}, "Finished over time"),
        r.finished || r.series.some((s) => s.count)
          ? h("ul", { class: "report-list" }, r.series.map((s) => {
              const label = s.daily ? fmt(s.from, { weekday: "short", day: "numeric" }) : `Week of ${fmt(s.from, { month: "short", day: "numeric" })}`;
              return h("li", { class: "report-row" }, h("span", { class: "small" }, label),
                h("div", { class: "bar", role: "img", "aria-label": `${label}: ${plural(s.count, "task")}` }, h("span", { class: "bar-fill", style: `width: ${Math.round((s.count / maxSeries) * 100)}%` })),
                h("strong", { class: "report-num" }, String(s.count)));
            }))
          : h("p", { class: "muted" }, "Nothing finished in this period.")),

      r.finished ? h("section", { class: "card" }, h("h2", {}, "Early, on time or late"),
        h("ul", { class: "report-list" }, timingRow("Early", r.timing.early), timingRow("On time", r.timing.ontime), timingRow("Late", r.timing.late), timingRow("No deadline", r.timing.nodeadline)),
        h("p", { class: "muted small" }, `“Early” means finished at least ${settings.earlyHours} hours before the deadline. It uses each task's current deadline.`)) : null,

      r.groups.length ? h("section", { class: "card" }, h("h2", {}, "By course and organization"),
        h("ul", { class: "report-list" }, r.groups.map((g) => h("li", { class: "report-row report-row-2" },
          h("span", { class: `chip chip-${g.workspace}` }, g.name),
          h("span", { class: "muted small" }, `${g.finished} finished${g.late ? `, ${g.late} late` : ""}`))))) : null,

      r.types.length ? h("section", { class: "card" }, h("h2", {}, "By task type"),
        h("ul", { class: "report-list" }, r.types.map((t) => h("li", { class: "report-row report-row-2" }, h("span", {}, t.name), h("strong", { class: "report-num" }, String(t.finished)))))) : null,

      r.eventCount ? h("section", { class: "card" }, h("h2", {}, "Events"),
        h("p", { class: "muted small" }, `${plural(r.eventCount, "event")} in this period.`),
        h("ul", { class: "report-list" }, r.kinds.map((k) => h("li", { class: "report-row report-row-2" }, h("span", {}, k.name), h("strong", { class: "report-num" }, String(k.count)))))) : null,

      h("section", { class: "card" }, h("h2", {}, "Take it with you"),
        h("p", { class: "muted" }, "A spreadsheet file (opens in Excel or Google Sheets) with all your tasks, archived ones included."),
        h("button", { type: "button", class: "btn", onClick: () => {
          const csv = tasksToCsv(state.tasks, { groupName: taskGroupName, typeName });
          const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
          const link = h("a", { href: url, download: backupFileName().replace("backup", "tasks").replace(".json", ".csv") });
          document.body.append(link); link.click(); link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          toast("Spreadsheet saved to your downloads.");
        } }, "Download tasks (CSV)")),
      h("p", { class: "muted small" }, "Reports include archived tasks. “Finished” counts tasks marked Done inside the period."),
    ].filter(Boolean));
  }

  render();
  return { update: render };
}

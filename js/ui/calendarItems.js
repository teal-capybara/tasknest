/* One row for an event or a task deadline, used by the Calendar lists and the day window. */

import { h } from "./dom.js";
import { state, eventGroupName, taskGroupName, eventKindName } from "../state.js";
import { formatClock } from "../logic/calendar.js";

export function itemRow(item) {
  if (item.type === "event") {
    const e = item.event;
    const group = eventGroupName(e);
    return h("li", { class: `cal-item cal-item-event kind-${e.kind}` },
      h("a", { class: "cal-link", href: `#/event/${encodeURIComponent(e.id)}` },
        h("span", { class: "cal-time" }, e.allDay ? "All day" : formatClock(e.startAt)),
        h("span", { class: "cal-main" },
          h("span", { class: "cal-title" }, h("span", { class: "cal-mark cal-mark-event", "aria-hidden": "true" }), e.title),
          h("span", { class: "cal-meta" },
            h("span", { class: `chip chip-kind kind-${e.kind}` }, eventKindName(e.kind)),
            group ? h("span", { class: "muted small" }, group) : null,
            e.location ? h("span", { class: "muted small" }, h("span", { "aria-hidden": "true" }, "📍 "), e.location) : null))));
  }
  const t = item.task;
  const done = t.status === "done";
  return h("li", { class: `cal-item cal-item-task${done ? " is-done" : ""}` },
    h("a", { class: "cal-link", href: `#/task/${encodeURIComponent(t.id)}` },
      h("span", { class: "cal-time" }, formatClock(t.dueAt)),
      h("span", { class: "cal-main" },
        h("span", { class: "cal-title" }, h("span", { class: "cal-mark cal-mark-task", "aria-hidden": "true" }), t.title),
        h("span", { class: "cal-meta" },
          h("span", { class: "chip" }, done ? "✓ Task done" : "Task due"),
          h("span", { class: "muted small" }, taskGroupName(t))))));
}

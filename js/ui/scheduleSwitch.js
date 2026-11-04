/* The "Schedule | Courses" switch at the top of both pages. On a computer the sidebar has both pages, so the switch is hidden there (css). */

import { h } from "./dom.js";
import { go } from "../router.js";

export function scheduleSwitch(active) {
  const btn = (id, name, path) => h("button", { type: "button", class: "seg-btn", "aria-pressed": String(active === id), onClick: () => { if (active !== id) go(path); } }, name);
  return h("div", { class: "seg sched-switch", role: "group", "aria-label": "Show" }, btn("schedule", "Schedule", "/schedule"), btn("courses", "Courses", "/courses"));
}

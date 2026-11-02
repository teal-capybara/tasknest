/* The "List | Board" switch shown at the top of the Tasks screen and the Board screen. */

import { h } from "./dom.js";
import { go } from "../router.js";

export function tasksSwitch(active) {
  const btn = (id, name, path) => h("button", {
    type: "button", class: "seg-btn", "aria-pressed": String(active === id),
    onClick: () => { if (active !== id) go(path); },
  }, name);
  return h("div", { class: "seg tasks-switch", role: "group", "aria-label": "Show tasks as" }, btn("list", "List", "/tasks"), btn("board", "Board", "/board"));
}

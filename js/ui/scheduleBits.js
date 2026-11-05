/* Small pieces shared by the Schedule and Courses pages. */

import { h } from "./dom.js";
import { icon } from "./capybara.js";
import { sticker } from "./stickers.js";
import { termName, kindName, formatRange, dayShort } from "../logic/schedule.js";

/** The capybara banner at the top of both pages: a soft gradient, a big capybara and a few stickers. */
export function banner(title, term, art = "book") {
  return h("div", { class: "sched-banner" },
    sticker("star", "stk-b stk-b1"), sticker("sparkle", "stk-b stk-b2"), sticker("heart", "stk-b stk-b4"),
    h("div", { class: "sched-banner-text" },
      h("span", { class: "sched-cloud", "aria-hidden": "true" }, icon("cloud", 40)),
      h("h1", {}, title),
      h("p", { class: "sched-term" }, termName(term))),
    h("div", { class: "sched-banner-art", "aria-hidden": "true" }, h("img", { src: `icons/stk/${art}.webp`, alt: "", draggable: "false" })));
}

export const meetingText = (slot) => `${dayShort(slot.day)} ${formatRange(slot)}`;
export const kindLabel = (course) => (course.kind === "laboratory" ? kindName("laboratory") : "");

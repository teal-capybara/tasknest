/* ==========================================================================
   STICKERS: the little capybaras and doodles from icons/stk/ that decorate the
   Schedule and Courses pages. They are pictures only (hidden from screen readers),
   never get in the way of taps, and are not recolored by themes.

   sticker("star")                 a small loose sticker
   peek("laptop", "left: 1.2rem")  a capybara head peeking over the top edge of a card
   ========================================================================== */

import { h } from "./dom.js";

const img = (name) => h("img", { src: `icons/stk/${name}.webp`, alt: "", draggable: "false", decoding: "async", loading: "lazy" });

/** A loose sticker. `style` places it (the card must be position: relative). */
export const sticker = (name, cls = "stk-corner", style = "") =>
  h("span", { class: `stk ${cls}`, style, "aria-hidden": "true" }, img(name));

/** The top half of a capybara sitting on the top edge of a card. */
export const peek = (name, style = "") =>
  h("span", { class: "stk stk-peek", style, "aria-hidden": "true" }, img(name));

/** A bigger sticker with a short line under it, used at the end of a list. */
export const finale = (name, text) =>
  h("div", { class: "stk-finale", "aria-hidden": "true" }, h("span", { class: "stk stk-big" }, img(name)), h("p", {}, text));

export const STICKER_FILES = ["bag", "bed", "boba", "book", "books", "calendar", "clipboard", "clock", "flower", "grad", "heart", "hourglass", "laptop", "music", "paw", "pencil", "planner", "sleep", "sparkle", "sprout", "sprout2", "star"];

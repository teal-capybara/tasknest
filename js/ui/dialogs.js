/* ==========================================================================
   DIALOGS: confirm and prompt boxes built on the browser's <dialog> element.
   Pressing Escape or Cancel always means "no". Both return a Promise.
   ========================================================================== */

import { h } from "./dom.js";

let counter = 0;

function openDialog({ title, content, actions, onSubmit }) {
  return new Promise((resolve) => {
    const id = `dlg-${++counter}`;
    const form = h("form", { method: "dialog", novalidate: true },
      h("h2", { id: `${id}-title` }, title), content, actions);
    const dialog = h("dialog", { class: "dialog", "aria-labelledby": `${id}-title` }, form);

    // Our own submit handling, so pressing Enter in a text box confirms (not cancels).
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (onSubmit && onSubmit() === false) return; // stay open (validation failed)
      dialog.close("confirm");
    });
    dialog.addEventListener("close", () => {
      const confirmed = dialog.returnValue === "confirm";
      dialog.remove();
      resolve(confirmed);
    });

    document.body.append(dialog);
    dialog.showModal();
    // Focus the safest control first.
    const first = dialog.querySelector("input, select, [data-cancel]");
    if (first) first.focus();
  });
}

function buttons({ confirmLabel, cancelLabel, danger }, dialogRef) {
  return h("div", { class: "dialog-actions" },
    h("button", { type: "button", class: "btn", "data-cancel": "", onClick: (e) => e.target.closest("dialog").close("cancel") }, cancelLabel),
    h("button", { type: "submit", class: `btn ${danger ? "btn-danger" : "btn-primary"}` }, confirmLabel));
}

/**
 * Asks a yes/no question. Resolves true (confirmed) or false.
 *   message: plain text paragraph(s); body: optional extra element (e.g. a <select>)
 *   danger : red confirm button, for destructive actions
 */
export function confirmDialog({ title, message, body, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false }) {
  const paragraphs = [].concat(message || []).filter(Boolean).map((m) => h("p", {}, m));
  return openDialog({
    title,
    content: h("div", {}, paragraphs, body || null),
    actions: buttons({ confirmLabel, cancelLabel, danger }),
  });
}

/**
 * Asks for one line of text. Resolves with the text, or null if cancelled.
 * validate(text) returns an error message (string) to block saving, or "" if fine.
 */
export async function promptDialog({ title, label, value = "", confirmLabel = "Save", validate }) {
  const input = h("input", { type: "text", class: "input", value, "aria-label": label, autocomplete: "off" });
  const error = h("p", { class: "error-text", role: "alert", hidden: true });

  const confirmed = await openDialog({
    title,
    content: h("div", {}, h("label", { class: "label" }, label, input), error),
    actions: buttons({ confirmLabel, cancelLabel: "Cancel", danger: false }),
    onSubmit: () => {
      const message = validate ? validate(input.value) : "";
      error.textContent = message || "";
      error.hidden = !message;
      if (message) { input.focus(); return false; }
      return true;
    },
  });
  return confirmed ? input.value : null;
}

/* ==========================================================================
   THEME PICKER: the four preview buttons.
   Built with real <button role="radio"> elements so it works with touch,
   keyboard and screen readers.
   ========================================================================== */

import { THEMES } from "../theme.js";

export function renderThemePicker(container, selectedId, onSelect) {
  container.textContent = "";

  for (const theme of THEMES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-option";
    btn.setAttribute("role", "radio");
    btn.dataset.theme = theme.id;
    btn.setAttribute("aria-checked", String(theme.id === selectedId));
    // Preview colors come from the THEMES list, not the active theme.
    btn.style.setProperty("--swatch-bg", theme.bg);
    btn.style.setProperty("--swatch-text", theme.text);

    const name = document.createElement("span");
    name.className = "theme-name";
    name.textContent = theme.name + (theme.favorite ? " ★" : "");

    const dots = document.createElement("span");
    dots.className = "theme-dots";
    for (const color of theme.dots) {
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = color;
      dots.appendChild(dot);
    }

    btn.append(name, dots);
    btn.addEventListener("click", () => onSelect(theme.id));
    container.appendChild(btn);
  }
}

/** Update which option looks selected without rebuilding the buttons. */
export function markSelected(container, selectedId) {
  for (const btn of container.querySelectorAll(".theme-option")) {
    btn.setAttribute("aria-checked", String(btn.dataset.theme === selectedId));
  }
}

/* ==========================================================================
   SIDEBAR (wide screens): collapse to a slim icon bar and back.
   The choice is remembered on this device. The sidebar's capybara is drawn here.
   ========================================================================== */

import { capybara } from "./capybara.js";

const KEY = "tasknest.sidebar";

function read() { try { return localStorage.getItem(KEY) === "collapsed"; } catch { return false; } }
function write(collapsed) { try { localStorage.setItem(KEY, collapsed ? "collapsed" : "open"); } catch { /* fine */ } }

const button = document.getElementById("side-toggle");
const mascot = document.getElementById("side-mascot");

function apply(collapsed) {
  document.body.classList.toggle("side-collapsed", collapsed);
  if (button) {
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", collapsed ? "Expand the sidebar" : "Collapse the sidebar");
  }
}

if (mascot) {
  mascot.append(capybara("read"));
  const p = document.createElement("p");
  p.className = "side-mascot-text";
  p.textContent = "You're doing great! Keep going!";
  mascot.append(p);
}
apply(read());
if (button) button.addEventListener("click", () => { const next = !document.body.classList.contains("side-collapsed"); write(next); apply(next); });

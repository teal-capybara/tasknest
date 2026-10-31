/* ==========================================================================
   ROUTER: shows the right screen for the address in the browser bar.

   Addresses use a "#" so they work on GitHub Pages and can be bookmarked:
     #/tasks               the task list
     #/task/new            add a task      (#/task/new?from=ID duplicates a task)
     #/task/ID             one task's details
     #/task/ID/edit        edit a task
     #/manage              courses and task types
     #/settings            theme, account, install

   A "view" is a function  (container, params, query) => { update?, destroy? }
     update()  is called when your data changes (so the screen can redraw)
     destroy() is called when you leave the screen

   To add a new screen: create a view file, then add one line to ROUTES in main.js.
   ========================================================================== */

import { state, subscribe } from "./state.js";
import { h } from "./ui/dom.js";

let routes = [];
let container = null;
let current = null;        // the mounted view instance
let pending = null;        // a matched route waiting for data to load
let unsubscribe = null;
let clock = null;

const isReady = () => Object.values(state.ready).every(Boolean);

/** "/task/:id/edit" -> a regular expression that captures :id */
function compile(pattern) {
  const names = [];
  const source = pattern.replace(/:([a-zA-Z]+)/g, (_, name) => { names.push(name); return "([^/]+)"; });
  return { regex: new RegExp(`^${source}$`), names };
}

export function defineRoutes(list) {
  routes = list.map((r) => ({ ...r, ...compile(r.path) }));
}

export function startRouter(el) {
  container = el;
  window.addEventListener("hashchange", navigate);
  unsubscribe = subscribe(onDataChange);
  // Urgency depends on the current time, so redraw once a minute.
  clock = setInterval(() => current && current.update && current.update(), 60 * 1000);
  navigate();
}

export function stopRouter() {
  window.removeEventListener("hashchange", navigate);
  if (unsubscribe) unsubscribe();
  clearInterval(clock);
  destroyCurrent();
  pending = null;
}

export function go(path) {
  location.hash = `#${path}`;
}

function parseHash() {
  const raw = location.hash.slice(1) || "/tasks";
  const [path, queryString = ""] = raw.split("?");
  return { path, query: Object.fromEntries(new URLSearchParams(queryString)) };
}

function destroyCurrent() {
  if (current && current.destroy) current.destroy();
  current = null;
}

function navigate() {
  destroyCurrent();
  const { path, query } = parseHash();

  for (const route of routes) {
    const m = route.regex.exec(path);
    if (!m) continue;
    const params = {};
    route.names.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
    pending = { route, params, query };
    highlightNav(route.nav);
    document.title = `${route.title} · TaskNest`;
    if (isReady()) mount();
    else showLoading();
    return;
  }
  location.replace("#/tasks"); // unknown address: go home
}

function mount() {
  if (!pending) return;
  const { route, params, query } = pending;
  pending = null;
  container.textContent = "";
  current = route.view(container, params, query) || {};
  window.scrollTo(0, 0);
}

function onDataChange() {
  if (!current && pending && isReady()) mount();
  else if (current && current.update) current.update();
}

function highlightNav(name) {
  document.querySelectorAll("[data-route]").forEach((link) => {
    if (link.dataset.route === name) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function showLoading() {
  container.textContent = "";
  const hint = h("p", { class: "muted", hidden: true },
    "Still loading… If this does not finish, check your connection and the database rules (README, troubleshooting).");
  container.append(h("div", { class: "loading-view" }, h("div", { class: "spinner", role: "status", "aria-label": "Loading" }), hint));
  setTimeout(() => { hint.hidden = false; }, 6000);
}

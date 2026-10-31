/* ==========================================================================
   DOM HELPER: a tiny, safe way to build page elements in JavaScript.

     h("a", { class: "btn", href: "#/tasks" }, "Go to ", h("strong", {}, "tasks"))

   Text you pass in is always inserted as plain TEXT (never as HTML), so a task
   title like "<b>hi</b>" is shown literally and can never break or hijack the
   page. Use this for everything that shows your own data.

   Attribute rules:
     class        -> className          value   -> set after children (works for <select>)
     checked      -> the checked property
     dataset      -> { name: "x" } becomes data-name="x"
     onClick ...  -> event listeners (any attribute starting with "on")
     false/null   -> the attribute is skipped; true -> attribute present
   ========================================================================== */

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  let deferredValue;

  for (const [key, val] of Object.entries(attrs || {})) {
    if (val === null || val === undefined || val === false) continue;
    if (key === "class") el.className = val;
    else if (key === "value") deferredValue = val;
    else if (key === "checked") el.checked = Boolean(val);
    else if (key === "dataset") Object.assign(el.dataset, val);
    else if (key.startsWith("on") && typeof val === "function") el.addEventListener(key.slice(2).toLowerCase(), val);
    else el.setAttribute(key, val === true ? "" : val);
  }

  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child.nodeType ? child : document.createTextNode(String(child)));
  }

  if (deferredValue !== undefined) el.value = deferredValue; // after <option>s exist
  return el;
}

/** Removes everything inside an element. */
export function clear(el) {
  el.textContent = "";
  return el;
}

/** Builds <option> elements from [{ id, name }] with one pre-selected. */
export function optionEls(list, selectedId) {
  return list.map((item) => h("option", { value: item.id, selected: item.id === selectedId }, item.name));
}

/** Fills a <select> only when its choices changed, so an open menu is not disturbed. */
export function fillSelect(select, list, selectedId, { placeholder } = {}) {
  const items = placeholder !== undefined ? [{ id: "", name: placeholder }, ...list] : list;
  const signature = items.map((i) => `${i.id}:${i.name}`).join("|");
  if (select.dataset.sig !== signature) {
    select.dataset.sig = signature;
    clear(select).append(...items.map((i) => h("option", { value: i.id }, i.name)));
  }
  select.value = items.some((i) => i.id === selectedId) ? selectedId : (items[0] ? items[0].id : "");
}

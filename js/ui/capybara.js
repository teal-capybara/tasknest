/* ==========================================================================
   CAPYBARAS and ICONS: the pictures used around the app.

   The capybara pictures are image files in icons/art/ (cut out of the artwork
   you provided). They are NOT recolored by themes, on purpose: the capybaras
   always look the same. Only buttons, cards and backgrounds follow the theme.

   capybara("study")   returns an <span class="capy capy-study"> with the picture inside.
   poses: thinking, working, relaxing, cheering, coffee, study, goal

   icon("home")        returns an <img class="ui-icon"> from icons/ui/.
   The teal "button" icons (home, tasks, calendar, manage, settings, add, search ...)
   take the theme's hue (see --icon-hue in css/themes.css). Icons with a meaning of
   their own (overdue red, due today yellow, completed green ...) keep their colors.
   ========================================================================== */

const POSES = {
  thinking: [364, 380],
  working:  [423, 380],
  relaxing: [460, 260],
  cheering: [403, 380],
  coffee:   [460, 339],
  study:    [418, 380],
  goal:     [389, 380],
};

/** Icons that keep their own colors (everything else follows the theme's hue). */
const FIXED_COLOR = new Set(["overdue", "duetoday", "duesoon", "inprogress", "completed", "archived", "favorite", "bell", "profile", "sparkle", "star", "sprout", "heart", "cloud"]);

export function capybara(pose = "cheering") {
  const key = POSES[pose] ? pose : "cheering";
  const [w, h] = POSES[key];
  const el = document.createElement("span");
  el.className = `capy capy-${key}`;
  const img = document.createElement("img");
  img.src = `icons/art/capy-${key}.png`;
  img.alt = "";
  img.width = w; img.height = h;
  img.decoding = "async";
  img.draggable = false;
  el.append(img);
  return el;
}

export function icon(name, size = 24) {
  const img = document.createElement("img");
  img.src = `icons/ui/${name}.png`;
  img.alt = "";
  img.width = size; img.height = size;
  img.className = `ui-icon${FIXED_COLOR.has(name) ? " is-fixed" : ""}`;
  img.draggable = false;
  return img;
}

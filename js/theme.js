/* ==========================================================================
   THEME HANDLING

   The colors live in css/themes.css. This file only:
     - lists the available themes (name + preview colors for the picker)
     - applies a theme by setting <html data-theme="...">
     - remembers the last theme on THIS device (localStorage) so the app opens
       in the right colors immediately, even offline.
   The theme is also saved to your account (see js/db/settings.js) so it follows
   you to your other devices.

   To add a theme: add a block in css/themes.css, then add an entry below.
   ========================================================================== */

export const DEFAULT_THEME = "teal-sunshine";

// bg/text/dots are only used to draw the little preview buttons in Settings.
// mode ("Light" or "Dark") is the small label shown under each name.
export const THEMES = [
  { id: "teal-sunshine", name: "Teal & Sunshine", mode: "Light", bg: "#FDF9E3", text: "#17352F", dots: ["#8ED1C4", "#F5DB6E", "#FFFFFF"], favorite: true },
  { id: "pastel-bloom",  name: "Pastel Bloom",    mode: "Light", bg: "#FFF5FA", text: "#3B2142", dots: ["#F4B6D6", "#CDBDF5", "#FFFFFF"] },
  { id: "ocean-breeze",  name: "Ocean Breeze",    mode: "Light", bg: "#F4F8FF", text: "#1D2A4D", dots: ["#A9C8F5", "#BDB9F7", "#FFFFFF"] },
  { id: "sakura-mist",   name: "Sakura Mist",     mode: "Light", bg: "#F8EEEE", text: "#3A2733", dots: ["#E4C8D5", "#98788F", "#FFFAFA"] },
  { id: "midnight",      name: "Midnight",        mode: "Dark",  bg: "#1F2430", text: "#EEEBDF", dots: ["#6FB9AB", "#E8C36F", "#2A3040"] },
  { id: "velvet-dusk",   name: "Velvet Dusk",     mode: "Dark",  bg: "#302B3D", text: "#EEE8F6", dots: ["#B49ACB", "#E6C2A0", "#40384F"] },
  { id: "rose-eclipse",  name: "Rosé Eclipse",    mode: "Dark",  bg: "#352A33", text: "#F5EAF0", dots: ["#C28DA4", "#E6C79C", "#493541"] },
  { id: "abyssal-tide",  name: "Abyssal Tide",    mode: "Dark",  bg: "#20333A", text: "#E8F3F1", dots: ["#82BDB6", "#E3C98F", "#304A51"] },
];

const STORAGE_KEY = "tasknest.theme";

export function isValidTheme(id) {
  return THEMES.some((t) => t.id === id);
}

export function applyTheme(id) {
  const theme = isValidTheme(id) ? id : DEFAULT_THEME;
  document.documentElement.setAttribute("data-theme", theme);

  // Make the phone's browser bar match the theme.
  const color = getComputedStyle(document.documentElement).getPropertyValue("--meta-theme").trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && color) meta.setAttribute("content", color);

  try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* storage blocked: fine */ }
  return theme;
}

export function currentTheme() {
  return document.documentElement.getAttribute("data-theme") || DEFAULT_THEME;
}

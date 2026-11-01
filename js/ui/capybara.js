/* ==========================================================================
   CAPYBARAS: small original illustrations used as decoration.

   Drawn here as plain SVG (no image files to cache). The body colors are fixed
   browns; the grass uses the current theme's colors.
   capybara("read") sitting with a little book (sidebar)
   capybara("cloud") resting on a cloud with a mug (page banners)
   capybara("sit")  a full capybara sitting on grass, a tangerine on its head
   capybara("peek") just the head and ears, for peeking over the edge of a card
   The markup below is fixed text written here, never your own data.
   ========================================================================== */

const SIT = `
<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <ellipse cx="100" cy="109" rx="92" ry="9" style="fill: var(--accent)"/>
  <rect x="50" y="94" width="15" height="17" rx="7" fill="#9C6F46"/>
  <rect x="72" y="96" width="15" height="15" rx="7" fill="#8A5F3B"/>
  <rect x="112" y="96" width="15" height="15" rx="7" fill="#8A5F3B"/>
  <rect x="132" y="94" width="15" height="17" rx="7" fill="#9C6F46"/>
  <ellipse cx="96" cy="80" rx="60" ry="29" fill="#B98A5E"/>
  <ellipse cx="96" cy="92" rx="40" ry="14" fill="#D3AE86" opacity=".55"/>
  <ellipse cx="148" cy="62" rx="27" ry="23" fill="#B98A5E"/>
  <rect x="156" y="54" width="32" height="27" rx="13" fill="#A97A50"/>
  <ellipse cx="139" cy="42" rx="5" ry="6.5" fill="#8A5F3B"/>
  <ellipse cx="156" cy="40" rx="5" ry="6.5" fill="#8A5F3B"/>
  <circle cx="179" cy="61" r="2.6" fill="#4A2F1B"/>
  <circle cx="157" cy="55" r="3" fill="#2B1A10"/><circle cx="158" cy="54" r="1" fill="#fff"/>
  <circle cx="150" cy="68" r="5.5" fill="#F4A6A6" opacity=".55"/>
  <path d="M168 74q6 4 12 0" fill="none" stroke="#4A2F1B" stroke-width="2" stroke-linecap="round"/>
  <circle cx="148" cy="34" r="8" fill="#F59E0B"/><path d="M148 27q5-6 10-3-3 6-10 3z" fill="#4C9A3F"/>
</svg>`;

const PEEK = `
<svg viewBox="0 0 110 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <ellipse cx="46" cy="44" rx="40" ry="32" fill="#B98A5E"/>
  <rect x="54" y="26" width="46" height="34" rx="17" fill="#A97A50"/>
  <ellipse cx="22" cy="16" rx="6" ry="7.5" fill="#8A5F3B"/>
  <ellipse cx="44" cy="12" rx="6" ry="7.5" fill="#8A5F3B"/>
  <circle cx="93" cy="36" r="2.8" fill="#4A2F1B"/>
  <circle cx="56" cy="30" r="3.4" fill="#2B1A10"/><circle cx="57.2" cy="28.8" r="1.1" fill="#fff"/>
  <circle cx="46" cy="42" r="6" fill="#F4A6A6" opacity=".55"/>
  <path d="M72 48q7 5 14 0" fill="none" stroke="#4A2F1B" stroke-width="2.2" stroke-linecap="round"/>
</svg>`;

/* Sitting capybara reading a little book (no tangerine). */
const READ = SIT.replace(/<circle cx="148" cy="34" r="8"[^\n]*\n/, "").replace("</svg>",
  `<g transform="rotate(-10 150 90)"><rect x="130" y="78" width="38" height="25" rx="3" fill="#2F7D8C"/><rect x="132.5" y="80" width="33" height="20" rx="2" fill="#FFFFFF"/><path d="M149 80v20" stroke="#2F7D8C" stroke-width="2"/></g></svg>`);

/* A sleepy capybara resting on a cloud with a mug of something warm (heart on the mug). */
const CLOUD = `
<svg viewBox="0 0 220 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <g style="fill: var(--cloud); stroke: var(--cloud)" stroke-width="1.5">
    <circle cx="46" cy="86" r="20"/><circle cx="78" cy="76" r="26"/><circle cx="126" cy="76" r="26"/><circle cx="162" cy="86" r="20"/>
    <rect x="46" y="84" width="116" height="22" rx="11"/>
  </g>
  <rect x="48" y="82" width="114" height="22" rx="11" style="fill: var(--cloud)"/>
  <ellipse cx="104" cy="66" rx="48" ry="26" fill="#B98A5E"/>
  <ellipse cx="136" cy="56" rx="23" ry="20" fill="#B98A5E"/>
  <rect x="146" y="50" width="30" height="23" rx="11" fill="#A97A50"/>
  <ellipse cx="126" cy="38" rx="5" ry="6.5" fill="#8A5F3B"/><ellipse cx="144" cy="37" rx="5" ry="6.5" fill="#8A5F3B"/>
  <path d="M143 52q3.5 3.5 7 0" fill="none" stroke="#2B1A10" stroke-width="2" stroke-linecap="round"/>
  <circle cx="171" cy="57" r="2.4" fill="#4A2F1B"/>
  <circle cx="139" cy="64" r="5" fill="#F4A6A6" opacity=".55"/>
  <rect x="66" y="60" width="26" height="24" rx="6" fill="#FFFFFF" stroke="#D9C9B5" stroke-width="1.5"/>
  <path d="M92 66q9 2 0 12" fill="none" stroke="#D9C9B5" stroke-width="2.5"/>
  <path d="M79 79c-6-4-8-6-8-9 0-2 1.6-3.2 3.3-3.2 1.7 0 3.2.9 4.7 2.6 1.5-1.7 3-2.6 4.7-2.6 1.7 0 3.3 1.2 3.3 3.2 0 3-2 5-8 9z" style="fill: var(--mark-event)"/>
  <path d="M60 52q-2-10 8-12-1 9-8 12zM60 52q8-3 10 4-8 2-10-4z" fill="#4C9A3F"/>
  <path d="M182 22l2.2 5 5 2.2-5 2.2-2.2 5-2.2-5-5-2.2 5-2.2z" style="fill: var(--accent)"/>
  <path d="M26 30l1.6 3.6 3.6 1.6-3.6 1.6-1.6 3.6-1.6-3.6-3.6-1.6 3.6-1.6z" style="fill: var(--accent)"/>
</svg>`;

const VARIANTS = { sit: SIT, peek: PEEK, read: READ, cloud: CLOUD };

/** Returns a <span class="capy capy-KIND"> holding the drawing. kind: sit | peek | read | cloud */
export function capybara(kind = "sit") {
  const key = VARIANTS[kind] ? kind : "sit";
  const el = document.createElement("span");
  el.className = `capy capy-${key}`;
  el.innerHTML = VARIANTS[key];   // fixed markup from this file
  return el;
}

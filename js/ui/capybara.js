/* ==========================================================================
   CAPYBARAS: small original illustrations used as decoration.

   Drawn here as plain SVG (no image files to cache). The body colors are fixed
   browns; the grass uses the current theme's colors.
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

/** Returns a <span class="capy capy-sit|capy-peek"> holding the drawing. */
export function capybara(kind = "sit") {
  const el = document.createElement("span");
  el.className = `capy capy-${kind === "peek" ? "peek" : "sit"}`;
  el.innerHTML = kind === "peek" ? PEEK : SIT;   // fixed markup from this file
  return el;
}

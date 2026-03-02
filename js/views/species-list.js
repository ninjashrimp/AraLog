/* ==========================================================================
   AraLog – Species List View
   Browse and search the species catalog, grouped by family
   ========================================================================== */

import { speciesCatalog, searchSpecies, getFamilies } from '../data/species-catalog.js';
import db from '../db.js';

let _container = null;

async function init(container, params) {
  _container = container;

  // Load custom species
  const customSpecies = await db.customSpecies.toArray();
  const allSpecies = [
    ...speciesCatalog,
    ...customSpecies.map(s => ({ ...s, id: `custom_${s.id}`, distribution: 'eigene Art' })),
  ];

  container.innerHTML = `
    <div class="view-container">
      <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:var(--space-md);">
        <h2>Artenliste</h2>
        <span class="text-muted" style="font-size:var(--text-sm);">${allSpecies.length} Arten</span>
      </div>

      <div class="search-bar" style="margin-bottom: var(--space-lg);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input type="text" class="form-input" id="species-search"
               placeholder="Art, Familie oder wiss. Name..." autocomplete="off">
      </div>

      <div id="species-list">
        ${renderGroupedList(allSpecies)}
      </div>
    </div>
  `;

  container.querySelector('#species-search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const list = container.querySelector('#species-list');
    if (!list) return;

    if (!query) {
      list.innerHTML = renderGroupedList(allSpecies);
      return;
    }

    const catalogResults = searchSpecies(query, 50);
    const customResults = customSpecies.filter(s =>
      s.germanName?.toLowerCase().includes(query) ||
      s.scientificName?.toLowerCase().includes(query) ||
      s.family?.toLowerCase().includes(query)
    ).map(s => ({ ...s, id: `custom_${s.id}`, distribution: 'eigene Art' }));

    const results = [...catalogResults, ...customResults];

    list.innerHTML = results.length
      ? renderFlatList(results, query)
      : '<div class="empty-state"><h3>Keine Arten gefunden</h3></div>';
  });
}

function renderGroupedList(species) {
  const families = new Map();
  for (const s of species) {
    if (!families.has(s.family)) families.set(s.family, []);
    families.get(s.family).push(s);
  }

  const sorted = [...families.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return sorted.map(([family, members]) => `
    <div style="margin-bottom: var(--space-lg);">
      <div style="
        font-size: var(--text-xs);
        font-weight: var(--weight-semibold);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--accent);
        padding: var(--space-sm) 0;
        border-bottom: 1px solid var(--border-subtle);
        margin-bottom: var(--space-xs);
      ">${family} (${members.length})</div>
      ${members.map(renderSpecies).join('')}
    </div>
  `).join('');
}

function renderFlatList(species, query) {
  return species.map(s => renderSpecies(s, query)).join('');
}

function renderSpecies(species, query = '') {
  const distColor = species.distribution === 'häufig' ? 'badge-sicher'
    : species.distribution === 'mäßig verbreitet' ? 'badge-wahrscheinlich'
    : 'badge-unsicher';

  const germanName = query ? highlightMatch(species.germanName, query) : escapeHtml(species.germanName);
  const sciName = query ? highlightMatch(species.scientificName, query) : escapeHtml(species.scientificName);

  return `
    <div class="species-card">
      <div class="species-german">${germanName}</div>
      <div class="sci-name">${sciName}</div>
      <div style="display:flex; align-items:center; gap:var(--space-sm); margin-top:2px;">
        <span class="species-family">${escapeHtml(species.family)}</span>
        <span class="badge ${distColor} species-distribution">${species.distribution}</span>
      </div>
    </div>
  `;
}

function highlightMatch(text, query) {
  if (!query || !text) return escapeHtml(text || '');
  const escaped = escapeHtml(text);
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${q})`, 'gi');
  return escaped.replace(regex, '<mark style="background:var(--accent-bg);color:var(--accent-light);padding:0 1px;border-radius:2px;">$1</mark>');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function destroy() {
  _container = null;
}

export default { init, destroy };

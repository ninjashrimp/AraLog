/* ==========================================================================
   AraLog – Species List View
   Browse and search the species catalog, grouped by family
   With observation counts per species
   ========================================================================== */

import { speciesCatalog, searchSpecies, getFamilies } from '../data/species-catalog.js';
import db from '../db.js';

let _container = null;
let _obsCounts = new Map();  // speciesName → count

async function init(container, params) {
  _container = container;

  // Load observation counts per species
  _obsCounts = new Map();
  const observations = await db.observations.toArray();
  for (const obs of observations) {
    if (obs.speciesName) {
      _obsCounts.set(obs.speciesName, (_obsCounts.get(obs.speciesName) || 0) + 1);
    }
  }

  const observedSpeciesCount = _obsCounts.size;

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
        <span class="text-muted" style="font-size:var(--text-sm);">${observedSpeciesCount} beobachtet / ${allSpecies.length} im Katalog</span>
      </div>

      <div class="species-sort-bar" style="display:flex; gap:var(--space-sm); margin-bottom:var(--space-md);">
        <button type="button" class="filter-chip selected" data-sort="family">Nach Familie</button>
        <button type="button" class="filter-chip" data-sort="count">Nach Häufigkeit</button>
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

  let currentSort = 'family';

  // Sort toggle
  container.querySelector('.species-sort-bar')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sort]');
    if (!btn) return;

    currentSort = btn.dataset.sort;
    container.querySelectorAll('.species-sort-bar .filter-chip').forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');

    const query = container.querySelector('#species-search')?.value?.toLowerCase().trim() || '';
    updateList(allSpecies, customSpecies, query, currentSort);
  });

  // Search
  container.querySelector('#species-search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    updateList(allSpecies, customSpecies, query, currentSort);
  });
}

function updateList(allSpecies, customSpecies, query, sort) {
  const list = _container?.querySelector('#species-list');
  if (!list) return;

  if (!query) {
    list.innerHTML = sort === 'count'
      ? renderByCount(allSpecies)
      : renderGroupedList(allSpecies);
    return;
  }

  const catalogResults = searchSpecies(query, 50);
  const customResults = customSpecies.filter(s =>
    s.germanName?.toLowerCase().includes(query) ||
    s.scientificName?.toLowerCase().includes(query) ||
    s.family?.toLowerCase().includes(query)
  ).map(s => ({ ...s, id: `custom_${s.id}`, distribution: 'eigene Art' }));

  const results = [...catalogResults, ...customResults];

  if (!results.length) {
    list.innerHTML = '<div class="empty-state"><h3>Keine Arten gefunden</h3></div>';
    return;
  }

  list.innerHTML = sort === 'count'
    ? renderByCount(results)
    : renderFlatList(results, query);
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
      ${members.map(s => renderSpecies(s)).join('')}
    </div>
  `).join('');
}

function renderByCount(species) {
  // Only show species with observations, sorted by count desc
  const withCounts = species
    .map(s => ({ ...s, count: _obsCounts.get(s.germanName) || 0 }))
    .sort((a, b) => b.count - a.count);

  const observed = withCounts.filter(s => s.count > 0);
  const unobserved = withCounts.filter(s => s.count === 0);

  let html = '';

  if (observed.length) {
    html += observed.map(s => renderSpecies(s)).join('');
  }

  if (unobserved.length) {
    html += `
      <div style="
        font-size: var(--text-xs);
        color: var(--text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: var(--space-md) 0 var(--space-sm);
        border-top: 1px solid var(--border-subtle);
        margin-top: var(--space-md);
      ">Noch nicht beobachtet (${unobserved.length})</div>
      ${unobserved.map(s => renderSpecies(s)).join('')}
    `;
  }

  return html;
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
  const count = _obsCounts.get(species.germanName) || 0;

  return `
    <div class="species-card">
      <div style="display:flex; justify-content:space-between; align-items:baseline;">
        <div class="species-german">${germanName}</div>
        ${count > 0 ? `<span class="species-obs-count">${count}×</span>` : ''}
      </div>
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
  _obsCounts = new Map();
}

export default { init, destroy };

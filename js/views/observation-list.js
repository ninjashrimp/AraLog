/* ==========================================================================
   AraLog – Observation List View
   Main list with search + combinable filter chips + entry count
   ========================================================================== */

import db from '../db.js';

let _container = null;
let _thumbUrls = [];
let _allObservations = [];
let _thumbMap = new Map();
let _activeFilters = { year: null, species: null, confidence: null, evidenceType: null, arages: false, obsorg: false };

async function init(container, params) {
  _container = container;
  _activeFilters = { year: null, species: null, confidence: null, evidenceType: null, arages: false, obsorg: false };

  _allObservations = await db.observations
    .orderBy('date')
    .reverse()
    .toArray();

  _thumbMap = await loadThumbnails(_allObservations);

  const filterData = extractFilterOptions(_allObservations);

  container.innerHTML = `
    <div class="view-container">
      <div class="list-header">
        <span class="list-count" id="list-count">${_allObservations.length} Beobachtung${_allObservations.length !== 1 ? 'en' : ''}</span>
      </div>

      <div class="list-toolbar">
        <div class="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input type="text" class="form-input" id="search-input"
                 placeholder="Art, Ort, Datum..." autocomplete="off">
        </div>
      </div>

      <div id="filter-bar" class="filter-bar">
        ${renderFilterGroup('Jahr', 'year', filterData.years)}
        ${renderFilterGroup('Art', 'species', filterData.species)}
        ${renderFilterGroup('Sicherheit', 'confidence', filterData.confidence)}
        ${renderFilterGroup('Fundtyp', 'evidenceType', filterData.evidenceTypes)}
        ${filterData.hasArages || filterData.hasObsOrg ? `
          <div class="filter-group">
            <span class="filter-group-label">Gemeldet</span>
            <div class="filter-chips">
              ${filterData.hasArages ? `<button type="button" class="filter-chip" data-key="arages" data-value="true">AraGes</button>` : ''}
              ${filterData.hasObsOrg ? `<button type="button" class="filter-chip" data-key="obsorg" data-value="true">Obs.org</button>` : ''}
            </div>
          </div>
        ` : ''}
      </div>

      <div id="filter-status" class="filter-status"></div>

      <div id="obs-list" class="obs-list">
        ${_allObservations.length === 0 ? renderEmptyState() : _allObservations.map(obs => renderListItem(obs, _thumbMap)).join('')}
      </div>
    </div>
  `;

  container.querySelector('#search-input')?.addEventListener('input', applyFilters);
  container.querySelector('#filter-bar')?.addEventListener('click', handleFilterClick);
}

// ═══════════════════════════════════════════════════════════════════
// Filter Logic
// ═══════════════════════════════════════════════════════════════════

function extractFilterOptions(observations) {
  const years = new Set();
  const species = new Set();
  const confidence = new Set();
  const evidenceTypes = new Set();
  let hasArages = false;
  let hasObsOrg = false;

  for (const obs of observations) {
    if (obs.date) years.add(obs.date.substring(0, 4));
    if (obs.speciesName) species.add(obs.speciesName);
    if (obs.confidence) confidence.add(obs.confidence);
    if (obs.evidenceType) evidenceTypes.add(obs.evidenceType);
    for (const t of (obs.tags || [])) {
      if (t.toLowerCase().includes('arages')) hasArages = true;
      if (t.toLowerCase().includes('observation.org')) hasObsOrg = true;
    }
  }

  return {
    years: [...years].sort().reverse(),
    species: [...species].sort(),
    confidence: [...confidence],
    evidenceTypes: [...evidenceTypes].sort(),
    hasArages,
    hasObsOrg,
  };
}

function renderFilterGroup(label, key, values) {
  if (!values.length) return '';
  return `
    <div class="filter-group">
      <span class="filter-group-label">${label}</span>
      <div class="filter-chips">
        ${values.map(v => `<button type="button" class="filter-chip" data-key="${key}" data-value="${escapeAttr(v)}">${escapeHtml(v)}</button>`).join('')}
      </div>
    </div>
  `;
}

function handleFilterClick(e) {
  const chip = e.target.closest('.filter-chip');
  if (!chip) return;

  const key = chip.dataset.key;
  const value = chip.dataset.value;

  if (key === 'arages' || key === 'obsorg') {
    _activeFilters[key] = !_activeFilters[key];
    chip.classList.toggle('selected', _activeFilters[key]);
  } else {
    if (_activeFilters[key] === value) {
      _activeFilters[key] = null;
      chip.classList.remove('selected');
    } else {
      chip.closest('.filter-chips')?.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('selected'));
      _activeFilters[key] = value;
      chip.classList.add('selected');
    }
  }

  applyFilters();
}

async function applyFilters() {
  const query = _container?.querySelector('#search-input')?.value?.toLowerCase().trim() || '';
  const list = _container?.querySelector('#obs-list');
  const status = _container?.querySelector('#filter-status');
  const countEl = _container?.querySelector('#list-count');
  if (!list) return;

  let filtered = _allObservations;

  if (query) {
    filtered = filtered.filter(obs =>
      (obs.speciesName || '').toLowerCase().includes(query) ||
      (obs.scientificName || '').toLowerCase().includes(query) ||
      (obs.locationName || '').toLowerCase().includes(query) ||
      (obs.date || '').includes(query) ||
      (obs.notes || '').toLowerCase().includes(query) ||
      (obs.tags || []).some(t => t.toLowerCase().includes(query))
    );
  }

  if (_activeFilters.year) {
    filtered = filtered.filter(obs => obs.date?.startsWith(_activeFilters.year));
  }
  if (_activeFilters.species) {
    filtered = filtered.filter(obs => obs.speciesName === _activeFilters.species);
  }
  if (_activeFilters.confidence) {
    filtered = filtered.filter(obs => obs.confidence === _activeFilters.confidence);
  }
  if (_activeFilters.evidenceType) {
    filtered = filtered.filter(obs => obs.evidenceType === _activeFilters.evidenceType);
  }
  if (_activeFilters.arages) {
    filtered = filtered.filter(obs => (obs.tags || []).some(t => t.toLowerCase().includes('arages')));
  }
  if (_activeFilters.obsorg) {
    filtered = filtered.filter(obs => (obs.tags || []).some(t => t.toLowerCase().includes('observation.org')));
  }

  const activeCount = Object.values(_activeFilters).filter(v => v).length;
  const isFiltered = activeCount > 0 || query;

  if (countEl) {
    countEl.textContent = isFiltered
      ? `${filtered.length} von ${_allObservations.length} Beobachtungen`
      : `${_allObservations.length} Beobachtung${_allObservations.length !== 1 ? 'en' : ''}`;
  }

  if (status) {
    if (isFiltered) {
      status.innerHTML = `<button type="button" class="filter-clear" id="btn-clear-filters">Alle Filter zurücksetzen</button>`;
      status.querySelector('#btn-clear-filters')?.addEventListener('click', clearAllFilters);
    } else {
      status.innerHTML = '';
    }
  }

  revokeThumbUrls();
  _thumbMap = await loadThumbnails(filtered);

  list.innerHTML = filtered.length === 0
    ? `<div class="empty-state"><h3>Keine Treffer</h3><p class="text-muted">Versuche andere Filter oder einen anderen Suchbegriff.</p></div>`
    : filtered.map(obs => renderListItem(obs, _thumbMap)).join('');
}

function clearAllFilters() {
  _activeFilters = { year: null, species: null, confidence: null, evidenceType: null, arages: false, obsorg: false };
  _container?.querySelectorAll('.filter-chip.selected').forEach(c => c.classList.remove('selected'));
  const search = _container?.querySelector('#search-input');
  if (search) search.value = '';
  applyFilters();
}

// ═══════════════════════════════════════════════════════════════════
// Thumbnails
// ═══════════════════════════════════════════════════════════════════

async function loadThumbnails(observations) {
  const map = new Map();
  const byPhotoId = [];
  const needsFallback = [];

  for (const obs of observations) {
    if (obs.photoIds?.length) {
      byPhotoId.push({ obsId: obs.id, photoId: obs.photoIds[0] });
    } else {
      needsFallback.push(obs.id);
    }
  }

  if (byPhotoId.length) {
    const ids = byPhotoId.map(t => t.photoId);
    const photos = await db.photos.where('id').anyOf(ids).toArray();
    const photoMap = new Map(photos.map(p => [p.id, p]));
    for (const { obsId, photoId } of byPhotoId) {
      const photo = photoMap.get(photoId);
      if (photo?.thumbnail) {
        const url = URL.createObjectURL(photo.thumbnail);
        _thumbUrls.push(url);
        map.set(obsId, url);
      }
    }
  }

  if (needsFallback.length) {
    for (const obsId of needsFallback) {
      try {
        const photo = await db.photos.where('observationId').equals(obsId).first();
        if (photo?.thumbnail) {
          const url = URL.createObjectURL(photo.thumbnail);
          _thumbUrls.push(url);
          map.set(obsId, url);
        }
      } catch (e) { /* no photos */ }
    }
  }

  return map;
}

// ═══════════════════════════════════════════════════════════════════
// Rendering
// ═══════════════════════════════════════════════════════════════════

function renderListItem(obs, thumbMap) {
  const confidenceClass = `badge-${obs.confidence || 'unsicher'}`;
  const dateFormatted = formatDate(obs.date);
  const thumbUrl = thumbMap?.get(obs.id);

  return `
    <a href="#view/${obs.id}" class="obs-list-item">
      ${thumbUrl
        ? `<img class="obs-thumb" src="${thumbUrl}" alt="">`
        : `<div class="obs-thumb-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/>
              <circle cx="8" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/>
              <circle cx="10" cy="7" r="1"/><circle cx="14" cy="7" r="1"/>
            </svg>
          </div>`
      }
      <div class="obs-info">
        <div class="obs-species">${obs.speciesName || 'Unbestimmt'}</div>
        <div class="obs-meta">
          <span>${dateFormatted}</span>
          ${obs.locationName ? `<span>· ${shortLocation(obs.locationName)}</span>` : ''}
        </div>
        <div class="obs-evidence">
          ${obs.evidenceType || ''}
          ${obs.evidenceType === 'Spinne' && obs.lifeStage ? ` · ${obs.lifeStage}` : ''}
          ${obs.confidence ? ` · <span class="badge ${confidenceClass}">${obs.confidence}</span>` : ''}
        </div>
      </div>
    </a>
  `;
}

function renderEmptyState() {
  return `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/>
        <circle cx="8" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/>
        <circle cx="10" cy="7" r="1"/><circle cx="14" cy="7" r="1"/>
      </svg>
      <h3>Noch keine Beobachtungen</h3>
      <p class="text-muted">Tippe auf <strong>+ Neu</strong>, um deine erste Beobachtung zu erfassen.</p>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function shortLocation(name) {
  if (!name) return "";
  const parts = name.split(", ");
  return parts.length > 2 ? parts.slice(-2).join(", ") : name;
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}

function revokeThumbUrls() {
  _thumbUrls.forEach(url => URL.revokeObjectURL(url));
  _thumbUrls = [];
}

function destroy() {
  revokeThumbUrls();
  _container = null;
  _allObservations = [];
  _thumbMap = new Map();
}

export default { init, destroy };

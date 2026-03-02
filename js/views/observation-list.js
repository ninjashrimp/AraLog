/* ==========================================================================
   AraLog – Observation List View
   Main list of all observations, sortable and searchable
   ========================================================================== */

import db from '../db.js';

let _container = null;
let _thumbUrls = [];  // Track for cleanup

async function init(container, params) {
  _container = container;

  const observations = await db.observations
    .orderBy('date')
    .reverse()
    .toArray();

  // Batch-load first thumbnail per observation
  const thumbMap = await loadThumbnails(observations);

  container.innerHTML = `
    <div class="view-container">
      <div class="list-toolbar">
        <div class="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input type="text" class="form-input" id="search-input"
                 placeholder="Art, Ort, Datum..." autocomplete="off">
        </div>
      </div>

      <div id="obs-list" class="obs-list">
        ${observations.length === 0 ? renderEmptyState() : observations.map(obs => renderListItem(obs, thumbMap)).join('')}
      </div>
    </div>
  `;

  // Search handler
  const searchInput = container.querySelector('#search-input');
  searchInput?.addEventListener('input', handleSearch);
}

async function loadThumbnails(observations) {
  const map = new Map();

  // Collect first photoId per observation
  const toLoad = [];
  for (const obs of observations) {
    if (obs.photoIds?.length) {
      toLoad.push({ obsId: obs.id, photoId: obs.photoIds[0] });
    }
  }

  if (!toLoad.length) return map;

  // Batch-load from DB
  const photoIds = toLoad.map(t => t.photoId);
  const photos = await db.photos.where('id').anyOf(photoIds).toArray();
  const photoMap = new Map(photos.map(p => [p.id, p]));

  for (const { obsId, photoId } of toLoad) {
    const photo = photoMap.get(photoId);
    if (photo?.thumbnail) {
      const url = URL.createObjectURL(photo.thumbnail);
      _thumbUrls.push(url);
      map.set(obsId, url);
    }
  }

  return map;
}

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
          ${obs.locationName ? `<span>· ${obs.locationName}</span>` : ''}
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

async function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  const list = _container?.querySelector('#obs-list');
  if (!list) return;

  let observations;

  if (!query) {
    observations = await db.observations.orderBy('date').reverse().toArray();
  } else {
    observations = await db.observations
      .orderBy('date')
      .reverse()
      .filter(obs =>
        (obs.speciesName || '').toLowerCase().includes(query) ||
        (obs.scientificName || '').toLowerCase().includes(query) ||
        (obs.locationName || '').toLowerCase().includes(query) ||
        (obs.date || '').includes(query) ||
        (obs.notes || '').toLowerCase().includes(query) ||
        (obs.tags || []).some(t => t.toLowerCase().includes(query))
      )
      .toArray();
  }

  // Reload thumbnails for filtered results
  revokeThumbUrls();
  const thumbMap = await loadThumbnails(observations);

  list.innerHTML = observations.length === 0
    ? `<div class="empty-state"><h3>Keine Treffer</h3><p class="text-muted">Versuche einen anderen Suchbegriff.</p></div>`
    : observations.map(obs => renderListItem(obs, thumbMap)).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function revokeThumbUrls() {
  _thumbUrls.forEach(url => URL.revokeObjectURL(url));
  _thumbUrls = [];
}

function destroy() {
  revokeThumbUrls();
  _container = null;
}

export default { init, destroy };

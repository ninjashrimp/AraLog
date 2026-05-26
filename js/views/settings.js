/* ==========================================================================
   AraLog – Settings View
   Export, Import, Storage info, App settings, Maintenance tools
   ========================================================================== */

import db, { getCounts, getStorageEstimate } from '../db.js';
import { reverseGeocode } from '../services/geocode-service.js';

let _container = null;

async function init(container, params) {
  _container = container;

  const counts = await getCounts();
  const storage = await getStorageEstimate();
  const missingLocations = await db.observations.filter(o => o.lat && o.lng && !o.locationName).count();

  container.innerHTML = `
    <div class="view-container">
      <h2>Einstellungen</h2>
      <a href="#species" class="btn btn-secondary btn-block" style="margin-bottom:var(--space-lg);">Artenliste (Katalog)</a>

      <!-- Storage -->
      <div class="settings-section">
        <h2>Speicher</h2>
        <div class="card">
          <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-sm);">
            <span>${counts.observations} Beobachtungen</span>
            <span>${counts.photos} Fotos</span>
          </div>
          <div class="storage-bar">
            <div class="storage-bar-fill" style="width: ${storage.usagePercent}%"></div>
          </div>
          <div class="storage-info">
            ${formatBytes(storage.usage)} von ${formatBytes(storage.quota)} belegt (${storage.usagePercent}%)
          </div>
        </div>
      </div>

      <!-- Maintenance -->
      <div class="settings-section">
        <h2>Wartung</h2>
        <div style="display: flex; flex-direction: column; gap: var(--space-md);">
          <button class="btn btn-secondary btn-block" id="btn-geocode-all" ${missingLocations === 0 ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            Ortsnamen auflösen (${missingLocations})
          </button>
          <div id="geocode-progress"></div>
        </div>
      </div>

      <!-- Export -->
      <div class="settings-section">
        <h2>Datenexport</h2>
        <div style="display: flex; flex-direction: column; gap: var(--space-md);">
          <button class="btn btn-secondary btn-block" id="btn-export-json">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            JSON-Export (Daten)
          </button>
          <button class="btn btn-secondary btn-block" id="btn-export-photos" ${counts.photos === 0 ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Foto-Export (ZIP)
          </button>
        </div>
      </div>

      <!-- Import -->
      <div class="settings-section">
        <h2>Datenimport</h2>
        <div style="display: flex; flex-direction: column; gap: var(--space-md);">
          <label class="btn btn-secondary btn-block" for="import-json-input">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            JSON-Import
          </label>
          <input type="file" id="import-json-input" accept=".json" hidden>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="settings-section">
        <h2>Gefahrenzone</h2>
        <button class="btn btn-danger btn-block" id="btn-delete-all">
          Alle Daten löschen
        </button>
      </div>

      <!-- App Info -->
      <div class="settings-section">
        <div class="text-muted" style="text-align: center; font-size: var(--text-sm);">
          <p>AraLog v1.0.0</p>
          <p>Arachniden-Feldtagebuch</p>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btn-export-json')?.addEventListener('click', exportJSON);
  container.querySelector('#btn-geocode-all')?.addEventListener('click', () => geocodeAll(container, params));

  container.querySelector('#btn-delete-all')?.addEventListener('click', async () => {
    if (confirm('ALLE Beobachtungen und Fotos unwiderruflich löschen?')) {
      if (confirm('Wirklich sicher? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        await db.observations.clear();
        await db.photos.clear();
        await db.customSpecies.clear();
        window.AraLog?.showToast('Alle Daten gelöscht', 'success');
        init(container, params);
      }
    }
  });

  container.querySelector('#import-json-input')?.addEventListener('change', handleImport);
}

// ═══════════════════════════════════════════════════════════════════
// Bulk Reverse Geocoding
// ═══════════════════════════════════════════════════════════════════

async function geocodeAll(container, params) {
  const btn = _container?.querySelector('#btn-geocode-all');
  const progressEl = _container?.querySelector('#geocode-progress');
  if (!progressEl) return;

  const observations = await db.observations
    .filter(o => o.lat && o.lng && !o.locationName)
    .toArray();

  if (!observations.length) {
    window.AraLog?.showToast('Alle Einträge haben bereits Ortsnamen', 'success');
    return;
  }

  if (btn) btn.disabled = true;

  let done = 0;
  let errors = 0;

  for (const obs of observations) {
    done++;
    progressEl.innerHTML = `
      <div class="geocode-progress-bar">
        <div class="geocode-progress-fill" style="width: ${(done / observations.length) * 100}%"></div>
      </div>
      <div class="geocode-progress-text">${done} / ${observations.length}</div>
    `;

    try {
      const name = await reverseGeocode(obs.lat, obs.lng);
      if (name) {
        await db.observations.update(obs.id, { locationName: name });
      } else {
        errors++;
      }
    } catch (err) {
      console.warn('[Geocode]', obs.id, err);
      errors++;
    }
  }

  const msg = errors
    ? `${done - errors} von ${done} Ortsnamen aufgelöst (${errors} Fehler)`
    : `${done} Ortsnamen aufgelöst`;
  window.AraLog?.showToast(msg, errors ? 'info' : 'success');

  // Refresh view
  init(container, params);
}

// ═══════════════════════════════════════════════════════════════════
// Export / Import
// ═══════════════════════════════════════════════════════════════════

async function exportJSON() {
  try {
    const [observations, customSpecies, locations] = await Promise.all([
      db.observations.toArray(),
      db.customSpecies.toArray(),
      db.locations.toArray(),
    ]);

    const cleanObs = observations.map(obs => {
      const { photoIds, ...rest } = obs;
      return { ...rest, photoCount: (photoIds || []).length };
    });

    const exportData = {
      meta: { app: 'AraLog', version: '1.0.0', exportDate: new Date().toISOString(), observationCount: observations.length },
      observations: cleanObs,
      customSpecies,
      locations,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aralog-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    window.AraLog?.showToast('Export erfolgreich', 'success');
  } catch (err) {
    console.error('[Export]', err);
    window.AraLog?.showToast('Export fehlgeschlagen', 'error');
  }
}

async function handleImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (data.meta?.app !== 'AraLog') {
      window.AraLog?.showToast('Keine gültige AraLog-Exportdatei', 'error');
      return;
    }

    const count = data.observations?.length || 0;
    if (confirm(`${count} Beobachtungen importieren?`)) {
      for (const obs of (data.observations || [])) {
        delete obs.id;
        obs.photoIds = [];
        await db.observations.add(obs);
      }
      for (const sp of (data.customSpecies || [])) {
        delete sp.id;
        await db.customSpecies.add(sp);
      }
      window.AraLog?.showToast(`${count} Beobachtungen importiert`, 'success');
      init(_container, {});
    }
  } catch (err) {
    console.error('[Import]', err);
    window.AraLog?.showToast('Import fehlgeschlagen – ungültiges Format', 'error');
  }
  e.target.value = '';
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
  return `${bytes.toFixed(1)} ${units[i]}`;
}

function destroy() { _container = null; }

export default { init, destroy };

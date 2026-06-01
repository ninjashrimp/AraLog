/* ==========================================================================
   AraLog – Settings View
   Export, Import, Storage info, Maintenance tools
   ========================================================================== */

import db, { getCounts, getStorageEstimate } from '../db.js';
import { reverseGeocode } from '../services/geocode-service.js';

let _container = null;

async function init(container, params) {
  _container = container;

  const counts = await getCounts();
  const storage = await getStorageEstimate();
  const missingLocations = await db.observations.filter(o => o.lat && o.lng && !o.locationName).count();

  // Count orphaned photo records (no blob data)
  const allPhotos = await db.photos.toArray();
  const orphanedPhotos = allPhotos.filter(p => !p.blob && !p.thumbnail);
  const orphanedCount = orphanedPhotos.length;

  // Check persistent storage status
  let persistentStatus = '';
  if (navigator.storage?.persisted) {
    const persisted = await navigator.storage.persisted();
    persistentStatus = persisted
      ? '<span style="color:var(--success);">Persistent Storage aktiv</span>'
      : '<span style="color:var(--warning);">Kein Persistent Storage – Daten könnten vom Browser gelöscht werden</span>';
  }

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
          ${persistentStatus ? `<div class="storage-info" style="margin-top:var(--space-sm);">${persistentStatus}</div>` : ''}
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
          <button class="btn btn-secondary btn-block" id="btn-cleanup-photos" ${orphanedCount === 0 ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Verwaiste Foto-Records aufräumen (${orphanedCount})
          </button>
          ${!persistentStatus.includes('aktiv') ? `
            <button class="btn btn-secondary btn-block" id="btn-request-persist">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Persistent Storage anfordern
            </button>
          ` : ''}
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
          <div id="export-progress"></div>
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

  // Event Handlers
  container.querySelector('#btn-export-json')?.addEventListener('click', exportJSON);
  container.querySelector('#btn-export-photos')?.addEventListener('click', exportPhotos);
  container.querySelector('#btn-geocode-all')?.addEventListener('click', () => geocodeAll(container, params));
  container.querySelector('#btn-cleanup-photos')?.addEventListener('click', () => cleanupOrphanedPhotos(container, params));
  container.querySelector('#btn-request-persist')?.addEventListener('click', requestPersistentStorage);

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
// Cleanup Orphaned Photos
// ═══════════════════════════════════════════════════════════════════

async function cleanupOrphanedPhotos(container, params) {
  const allPhotos = await db.photos.toArray();
  const orphaned = allPhotos.filter(p => !p.blob && !p.thumbnail);

  if (!orphaned.length) {
    window.AraLog?.showToast('Keine verwaisten Records gefunden', 'success');
    return;
  }

  if (!confirm(`${orphaned.length} Foto-Records ohne Bilddaten gefunden. Diese aufräumen?`)) return;

  let cleaned = 0;
  for (const photo of orphaned) {
    try {
      // Remove photoId from observation
      if (photo.observationId) {
        const obs = await db.observations.get(photo.observationId);
        if (obs?.photoIds) {
          const updated = obs.photoIds.filter(id => id !== photo.id);
          await db.observations.update(photo.observationId, { photoIds: updated });
        }
      }
      await db.photos.delete(photo.id);
      cleaned++;
    } catch (err) {
      console.warn('[Cleanup]', photo.id, err);
    }
  }

  window.AraLog?.showToast(`${cleaned} verwaiste Records entfernt`, 'success');
  init(container, params);
}

// ═══════════════════════════════════════════════════════════════════
// Persistent Storage
// ═══════════════════════════════════════════════════════════════════

async function requestPersistentStorage() {
  if (!navigator.storage?.persist) {
    window.AraLog?.showToast('Persistent Storage nicht unterstützt', 'error');
    return;
  }

  const granted = await navigator.storage.persist();
  if (granted) {
    window.AraLog?.showToast('Persistent Storage aktiviert', 'success');
  } else {
    window.AraLog?.showToast('Persistent Storage wurde vom Browser abgelehnt', 'error');
  }

  // Refresh view
  init(_container, {});
}

// ═══════════════════════════════════════════════════════════════════
// Bulk Reverse Geocoding
// ═══════════════════════════════════════════════════════════════════

async function geocodeAll(container, params) {
  const progressEl = _container?.querySelector('#geocode-progress');
  const btn = _container?.querySelector('#btn-geocode-all');
  if (!progressEl) return;

  const observations = await db.observations.filter(o => o.lat && o.lng && !o.locationName).toArray();
  if (!observations.length) { window.AraLog?.showToast('Alle Einträge haben bereits Ortsnamen', 'success'); return; }
  if (btn) btn.disabled = true;

  let done = 0, errors = 0;
  for (const obs of observations) {
    done++;
    progressEl.innerHTML = `
      <div class="geocode-progress-bar"><div class="geocode-progress-fill" style="width: ${(done / observations.length) * 100}%"></div></div>
      <div class="geocode-progress-text">${done} / ${observations.length}</div>
    `;
    try {
      const name = await reverseGeocode(obs.lat, obs.lng);
      if (name) await db.observations.update(obs.id, { locationName: name });
      else errors++;
    } catch (err) { console.warn('[Geocode]', obs.id, err); errors++; }
  }

  window.AraLog?.showToast(errors ? `${done - errors} von ${done} aufgelöst (${errors} Fehler)` : `${done} Ortsnamen aufgelöst`, errors ? 'info' : 'success');
  init(container, params);
}

// ═══════════════════════════════════════════════════════════════════
// Export JSON
// ═══════════════════════════════════════════════════════════════════

async function exportJSON() {
  try {
    const [observations, customSpecies, locations] = await Promise.all([
      db.observations.toArray(), db.customSpecies.toArray(), db.locations.toArray(),
    ]);

    const cleanObs = observations.map(obs => {
      const { photoIds, ...rest } = obs;
      return { ...rest, photoCount: (photoIds || []).length };
    });

    const exportData = {
      meta: { app: 'AraLog', version: '1.0.0', exportDate: new Date().toISOString(), observationCount: observations.length },
      observations: cleanObs, customSpecies, locations,
    };

    downloadBlob(
      new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }),
      `aralog-export-${new Date().toISOString().slice(0, 10)}.json`
    );
    window.AraLog?.showToast('Export erfolgreich', 'success');
  } catch (err) {
    console.error('[Export]', err);
    window.AraLog?.showToast('Export fehlgeschlagen', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════
// Export Photos (ZIP)
// ═══════════════════════════════════════════════════════════════════

async function exportPhotos() {
  const btn = _container?.querySelector('#btn-export-photos');
  const progressEl = _container?.querySelector('#export-progress');
  if (btn) btn.disabled = true;

  try {
    const JSZip = window.JSZip;
    if (!JSZip) {
      window.AraLog?.showToast('JSZip nicht verfügbar', 'error');
      if (btn) btn.disabled = false;
      return;
    }

    const zip = new JSZip();
    const observations = await db.observations.toArray();
    const obsMap = new Map(observations.map(o => [o.id, o]));

    const photos = await db.photos.toArray();
    const validPhotos = photos.filter(p => p.blob);

    if (!validPhotos.length) {
      window.AraLog?.showToast('Keine Fotos mit Bilddaten vorhanden', 'info');
      if (btn) btn.disabled = false;
      return;
    }

    let done = 0;
    for (const photo of validPhotos) {
      done++;
      if (progressEl) {
        progressEl.innerHTML = `
          <div class="geocode-progress-bar"><div class="geocode-progress-fill" style="width: ${(done / validPhotos.length) * 100}%"></div></div>
          <div class="geocode-progress-text">Foto ${done} / ${validPhotos.length}</div>
        `;
      }

      const obs = obsMap.get(photo.observationId);
      const species = sanitizeFilename(obs?.speciesName || 'Unbekannt');
      const date = obs?.date || 'undatiert';
      const suffix = photo.note ? `_${sanitizeFilename(photo.note)}` : '';
      const filename = `${species}_${date}_${photo.id}${suffix}.jpg`;

      zip.file(filename, photo.blob);
    }

    if (progressEl) progressEl.innerHTML = '<div class="geocode-progress-text">ZIP wird erstellt...</div>';

    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });

    downloadBlob(zipBlob, `aralog-fotos-${new Date().toISOString().slice(0, 10)}.zip`);
    window.AraLog?.showToast(`${done} Fotos exportiert`, 'success');
  } catch (err) {
    console.error('[Photo Export]', err);
    window.AraLog?.showToast('Foto-Export fehlgeschlagen: ' + err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (progressEl) progressEl.innerHTML = '';
  }
}

// ═══════════════════════════════════════════════════════════════════
// Import JSON
// ═══════════════════════════════════════════════════════════════════

async function handleImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (data.meta?.app !== 'AraLog') { window.AraLog?.showToast('Keine gültige AraLog-Exportdatei', 'error'); return; }

    const count = data.observations?.length || 0;
    if (confirm(`${count} Beobachtungen importieren?`)) {
      for (const obs of (data.observations || [])) { delete obs.id; obs.photoIds = []; await db.observations.add(obs); }
      for (const sp of (data.customSpecies || [])) { delete sp.id; await db.customSpecies.add(sp); }
      window.AraLog?.showToast(`${count} Beobachtungen importiert`, 'success');
      init(_container, {});
    }
  } catch (err) {
    console.error('[Import]', err);
    window.AraLog?.showToast('Import fehlgeschlagen – ungültiges Format', 'error');
  }
  e.target.value = '';
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(str) {
  return (str || '').replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_').replace(/_+/g, '_').substring(0, 40);
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

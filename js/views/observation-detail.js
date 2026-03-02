/* ==========================================================================
   AraLog – Observation Detail View
   Single observation display with all fields, photo gallery,
   and retroactive photo upload
   ========================================================================== */

import db from '../db.js';
import { getPhotosForObservation, deletePhoto, createPhotoUrl, revokeAllPhotoUrls } from '../services/photo-service.js';
import { createPhotoUpload } from '../components/photo-upload.js';

let _container = null;
let _photoUpload = null;

async function init(container, params) {
  _container = container;
  const id = parseInt(params?.id);

  if (!id) {
    container.innerHTML = '<div class="view-container"><div class="empty-state"><h3>Keine ID angegeben</h3></div></div>';
    return;
  }

  const obs = await db.observations.get(id);
  if (!obs) {
    container.innerHTML = `<div class="view-container"><div class="empty-state"><h3>Beobachtung #${id} nicht gefunden</h3></div></div>`;
    return;
  }

  // Load photos
  const photos = await getPhotosForObservation(id);

  container.innerHTML = `
    <div class="view-container">
      <div class="detail-header">
        <div>
          <div class="detail-species">${obs.speciesName || 'Unbestimmt'}</div>
          ${obs.scientificName ? `<div class="sci-name">${obs.scientificName}</div>` : ''}
          ${obs.confidence ? `<span class="badge badge-${obs.confidence}">${obs.confidence}</span>` : ''}
        </div>
        <div class="detail-actions">
          <a href="#edit/${id}" class="btn btn-secondary btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </a>
          <button class="btn btn-danger btn-sm" id="btn-delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- ── Photo Gallery ── -->
      <div class="detail-section" id="photo-section">
        <h3>Fotos ${photos.length > 0 ? `(${photos.length})` : ''}</h3>
        ${photos.length > 0 ? `
          <div class="detail-photos" id="photo-gallery">
            ${photos.map(p => {
              const url = createPhotoUrl(p.thumbnail || p.blob);
              return `
                <div class="detail-photo-wrapper" data-photo-id="${p.id}">
                  <img class="detail-photo" src="${url}" alt="${p.type || 'Foto'}">
                  <button type="button" class="photo-delete-btn" data-photo-id="${p.id}" aria-label="Foto löschen">×</button>
                </div>`;
            }).join('')}
          </div>
        ` : ''}

        <!-- Nachträglicher Upload -->
        <div id="detail-photo-upload" class="detail-photo-add"></div>
      </div>

      <div class="detail-section">
        <h3>Erfassung</h3>
        ${field('Datum', formatDate(obs.date))}
        ${field('Uhrzeit', obs.time)}
        ${field('Position', obs.lat && obs.lng ? `${obs.lat.toFixed(6)}, ${obs.lng.toFixed(6)}` : '–')}
        ${field('Ort', obs.locationName)}
      </div>

      <div class="detail-section">
        <h3>Fund-Klassifikation</h3>
        ${field('Fundtyp', obs.evidenceType)}
        ${field('Lebensstadium', obs.lifeStage)}
        ${field('Geschlecht', obs.sex)}
      </div>

      ${obs.behaviorTags?.length || obs.position || obs.approachReaction ? `
        <div class="detail-section">
          <h3>Verhalten & Position</h3>
          ${field('Position', obs.position)}
          ${obs.positionFreetext ? field('', obs.positionFreetext) : ''}
          ${field('Verhalten', (obs.behaviorTags || []).join(', '))}
          ${field('Spinne sichtbar', obs.spiderVisible === false ? 'Nein' : obs.spiderVisible === true ? 'Ja' : '–')}
          ${field('Reaktion', obs.approachReaction)}
        </div>
      ` : ''}

      ${obs.interactionTags?.length ? `
        <div class="detail-section">
          <h3>Interaktionen</h3>
          ${field('', (obs.interactionTags || []).join(', '))}
        </div>
      ` : ''}

      ${obs.webType || obs.webCondition || obs.cocoonCondition ? `
        <div class="detail-section">
          <h3>Netz/Gespinst</h3>
          ${field('Netztyp', obs.webType)}
          ${field('Zustand Netz', obs.webCondition)}
          ${field('Zustand Kokon', obs.cocoonCondition)}
        </div>
      ` : ''}

      ${obs.habitatTags?.length || obs.plant || obs.heightAboveGround ? `
        <div class="detail-section">
          <h3>Habitat</h3>
          ${field('Lebensraum', (obs.habitatTags || []).join(', '))}
          ${field('Pflanze', obs.plant)}
          ${field('Höhe ü. Boden', obs.heightAboveGround)}
        </div>
      ` : ''}

      ${obs.weatherTags?.length || obs.temperature != null ? `
        <div class="detail-section">
          <h3>Umgebung</h3>
          ${field('Wetter', (obs.weatherTags || []).join(', '))}
          ${field('Temperatur', obs.temperature != null ? `${obs.temperature} °C` : '')}
        </div>
      ` : ''}

      ${obs.notes || obs.tags?.length ? `
        <div class="detail-section">
          <h3>Notizen</h3>
          ${obs.notes ? `<p style="margin-bottom: var(--space-md);">${escapeHtml(obs.notes)}</p>` : ''}
          ${obs.tags?.length ? `<div class="tag-container">${obs.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
        </div>
      ` : ''}
    </div>
  `;

  // ── Mount retroactive photo upload ──
  const uploadMount = container.querySelector('#detail-photo-upload');
  if (uploadMount) {
    _photoUpload = createPhotoUpload({
      observationId: id,
      existingPhotos: [], // Already shown in gallery above
      mode: 'detail',
      onPhotosChanged: () => {
        window.AraLog?.showToast('Foto hinzugefügt', 'success');
        init(container, params); // Reload view
      },
    });
    uploadMount.appendChild(_photoUpload.el);
  }

  // ── Photo delete from gallery ──
  container.querySelectorAll('.photo-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const photoId = parseInt(btn.dataset.photoId);
      if (!photoId || !confirm('Foto wirklich löschen?')) return;

      try {
        await deletePhoto(photoId, id);
        window.AraLog?.showToast('Foto gelöscht', 'success');
        init(container, params);
      } catch (err) {
        console.error('[Detail] Photo delete error:', err);
        window.AraLog?.showToast('Fehler beim Löschen', 'error');
      }
    });
  });

  // ── Photo fullscreen on tap ──
  container.querySelectorAll('.detail-photo').forEach(img => {
    img.addEventListener('click', () => showFullscreenPhoto(img.src));
  });

  // ── Delete observation ──
  container.querySelector('#btn-delete')?.addEventListener('click', async () => {
    if (confirm('Beobachtung wirklich löschen?')) {
      for (const p of photos) await db.photos.delete(p.id);
      await db.observations.delete(id);
      window.AraLog?.showToast('Beobachtung gelöscht', 'success');
      window.AraLog?.navigate('');
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// Fullscreen Photo Viewer
// ═══════════════════════════════════════════════════════════════════

function showFullscreenPhoto(src) {
  const overlay = document.createElement('div');
  overlay.className = 'photo-fullscreen';
  overlay.innerHTML = `
    <img src="${src}" alt="Vollbild">
    <button class="photo-fullscreen-close" aria-label="Schließen">×</button>
  `;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('photo-fullscreen-close')) {
      overlay.remove();
    }
  });
  document.body.appendChild(overlay);
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function field(label, value) {
  if (!value && value !== 0) return '';
  return `
    <div class="detail-field">
      ${label ? `<span class="detail-field-label">${label}</span>` : ''}
      <span class="detail-field-value">${value}</span>
    </div>
  `;
}

function formatDate(dateStr) {
  if (!dateStr) return '–';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', {
      weekday: 'short', day: '2-digit', month: 'long', year: 'numeric'
    });
  } catch { return dateStr; }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function destroy() {
  revokeAllPhotoUrls();
  if (_photoUpload) {
    _photoUpload.destroy();
    _photoUpload = null;
  }
  _container = null;
}

export default { init, destroy };

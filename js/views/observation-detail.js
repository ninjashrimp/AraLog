/* ==========================================================================
   AraLog – Observation Detail View
   With photo gallery, external links, follow-up observations, and linking
   ========================================================================== */

import db from '../db.js';
import { getPhotosForObservation, deletePhoto, createPhotoUrl, revokeAllPhotoUrls } from '../services/photo-service.js';
import { createPhotoUpload } from '../components/photo-upload.js';
import { getSpeciesById } from '../data/species-catalog.js';

let _container = null;
let _photoUpload = null;

async function init(container, params) {
  _container = container;
  const id = parseInt(params?.id);

  if (!id) { container.innerHTML = '<div class="view-container"><div class="empty-state"><h3>Keine ID angegeben</h3></div></div>'; return; }

  const obs = await db.observations.get(id);
  if (!obs) { container.innerHTML = `<div class="view-container"><div class="empty-state"><h3>Beobachtung #${id} nicht gefunden</h3></div></div>`; return; }

  const photos = await getPhotosForObservation(id);
  const externalLinks = buildExternalLinks(obs);

  // Load linked observations
  const parentObs = obs.parentObservationId ? await db.observations.get(obs.parentObservationId) : null;
  const childObs = (await db.observations.filter(o => o.parentObservationId === id).toArray()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  container.innerHTML = `
    <div class="view-container">
      <div class="detail-header">
        <div>
          <div class="detail-species">${obs.speciesName || 'Unbestimmt'}</div>
          ${obs.scientificName ? `<div class="sci-name">${obs.scientificName}</div>` : ''}
          ${obs.confidence ? `<span class="badge badge-${obs.confidence}">${obs.confidence}</span>` : ''}
          ${externalLinks ? `<div class="detail-ext-links">${externalLinks}</div>` : ''}
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

      <!-- ── Linked Observations ── -->
      ${parentObs || childObs.length ? `
        <div class="detail-section">
          <h3>Verknüpfte Beobachtungen</h3>
          ${parentObs ? `
            <div class="linked-obs">
              <span class="linked-obs-label">Erstbeobachtung:</span>
              <a href="#view/${parentObs.id}" class="linked-obs-link">${formatDate(parentObs.date)} – ${parentObs.speciesName || 'Unbestimmt'}</a>
            </div>
          ` : ''}
          ${childObs.length ? childObs.map(c => `
            <div class="linked-obs">
              <span class="linked-obs-label">Folge:</span>
              <a href="#view/${c.id}" class="linked-obs-link">${formatDate(c.date)} – ${c.evidenceType || ''} ${c.notes ? '– ' + truncate(c.notes, 40) : ''}</a>
            </div>
          `).join('') : ''}
        </div>
      ` : ''}

      <!-- ── Action Buttons ── -->
      <div class="detail-section" style="display:flex; gap:var(--space-sm); flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" id="btn-followup">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>
          Folgebeobachtung
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          Verknüpfen
        </button>
        ${obs.parentObservationId ? `
          <button class="btn btn-secondary btn-sm" id="btn-unlink">Verknüpfung lösen</button>
        ` : ''}
      </div>

      <!-- Photo Gallery -->
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
                  <div class="photo-note" data-photo-id="${p.id}" title="Klicken zum Bearbeiten">${p.note ? escapeHtml(p.note) : '<span class="photo-note-placeholder">+ Notiz</span>'}</div>
                </div>`;
            }).join('')}
          </div>
        ` : ''}
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

      ${obs.interactionTags?.length ? `<div class="detail-section"><h3>Interaktionen</h3>${field('', (obs.interactionTags || []).join(', '))}</div>` : ''}

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

    <!-- Link Picker Overlay -->
    <div id="link-picker-overlay" class="link-picker-overlay" style="display:none;"></div>
  `;

  // ── Follow-up button ──
  container.querySelector('#btn-followup')?.addEventListener('click', () => {
    window.AraLog._prefill = {
      parentObservationId: id,
      speciesName: obs.speciesName,
      scientificName: obs.scientificName,
      speciesId: obs.speciesId,
      family: obs.family,
      lat: obs.lat,
      lng: obs.lng,
      locationName: obs.locationName,
      confidence: obs.confidence,
    };
    window.AraLog.navigate('new');
  });

  // ── Link button ──
  container.querySelector('#btn-link')?.addEventListener('click', () => showLinkPicker(id, obs));

  // ── Unlink button ──
  container.querySelector('#btn-unlink')?.addEventListener('click', async () => {
    if (confirm('Verknüpfung zur Erstbeobachtung lösen?')) {
      await db.observations.update(id, { parentObservationId: null });
      window.AraLog?.showToast('Verknüpfung gelöst', 'success');
      init(container, params);
    }
  });

  // ── Photo upload, delete, notes, fullscreen ──
  setupPhotoHandlers(container, params, id, photos);

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
// Link Picker
// ═══════════════════════════════════════════════════════════════════

async function showLinkPicker(currentId, currentObs) {
  const overlay = _container?.querySelector('#link-picker-overlay');
  if (!overlay) return;

  // Find candidate observations (same species, or all if unspecified)
  let candidates = await db.observations.orderBy('date').reverse().toArray();
  candidates = candidates.filter(o => o.id !== currentId && o.id !== currentObs.parentObservationId);

  // Sort: same species first
  if (currentObs.speciesName) {
    candidates.sort((a, b) => {
      const aMatch = a.speciesName === currentObs.speciesName ? 0 : 1;
      const bMatch = b.speciesName === currentObs.speciesName ? 0 : 1;
      return aMatch - bMatch || new Date(b.date) - new Date(a.date);
    });
  }

  overlay.style.display = '';
  overlay.innerHTML = `
    <div class="link-picker">
      <div class="link-picker-header">
        <h3>Erstbeobachtung wählen</h3>
        <button type="button" class="link-picker-close" id="link-picker-close">×</button>
      </div>
      <p class="text-muted" style="font-size:var(--text-sm); margin-bottom:var(--space-md);">
        Wähle die Beobachtung, zu der dieser Eintrag eine Folgebeobachtung ist.
      </p>
      <div class="link-picker-list">
        ${candidates.map(c => `
          <button type="button" class="link-picker-item ${c.speciesName === currentObs.speciesName ? 'same-species' : ''}" data-id="${c.id}">
            <div class="link-picker-species">${escapeHtml(c.speciesName || 'Unbestimmt')}</div>
            <div class="link-picker-meta">${formatDate(c.date)} ${c.locationName ? '· ' + truncate(c.locationName, 30) : ''}</div>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  overlay.querySelector('#link-picker-close')?.addEventListener('click', () => { overlay.style.display = 'none'; });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.style.display = 'none'; });

  overlay.querySelectorAll('.link-picker-item').forEach(item => {
    item.addEventListener('click', async () => {
      const parentId = parseInt(item.dataset.id);
      await db.observations.update(currentId, { parentObservationId: parentId });
      overlay.style.display = 'none';
      window.AraLog?.showToast('Verknüpfung erstellt', 'success');
      init(_container, { id: currentId });
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// Photo Handlers
// ═══════════════════════════════════════════════════════════════════

function setupPhotoHandlers(container, params, id, photos) {
  const uploadMount = container.querySelector('#detail-photo-upload');
  if (uploadMount) {
    _photoUpload = createPhotoUpload({
      observationId: id, existingPhotos: [], mode: 'detail',
      onPhotosChanged: () => { window.AraLog?.showToast('Foto hinzugefügt', 'success'); init(container, params); },
    });
    uploadMount.appendChild(_photoUpload.el);
  }

  container.querySelectorAll('.photo-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const photoId = parseInt(btn.dataset.photoId);
      if (!photoId || !confirm('Foto wirklich löschen?')) return;
      try { await deletePhoto(photoId, id); window.AraLog?.showToast('Foto gelöscht', 'success'); init(container, params); }
      catch (err) { window.AraLog?.showToast('Fehler beim Löschen', 'error'); }
    });
  });

  container.querySelectorAll('.photo-note').forEach(noteEl => {
    noteEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const photoId = parseInt(noteEl.dataset.photoId);
      if (!photoId || noteEl.querySelector('input')) return;
      const currentText = noteEl.textContent === '+ Notiz' ? '' : noteEl.textContent.trim();
      noteEl.innerHTML = `<input type="text" class="photo-note-input" value="${currentText.replace(/"/g, '&quot;')}" placeholder="z.B. Dorsalansicht, Epigyne…" maxlength="120">`;
      const input = noteEl.querySelector('input');
      input.focus();
      async function save() {
        const val = input.value.trim();
        try { await db.photos.update(photoId, { note: val || null }); } catch (err) { /* */ }
        noteEl.innerHTML = val ? escapeHtml(val) : '<span class="photo-note-placeholder">+ Notiz</span>';
      }
      input.addEventListener('blur', save);
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); } if (ev.key === 'Escape') { input.value = currentText; input.blur(); } });
    });
  });

  container.querySelectorAll('.detail-photo').forEach(img => {
    img.addEventListener('click', async () => {
      const wrapper = img.closest('[data-photo-id]');
      const photoId = parseInt(wrapper?.dataset.photoId);
      const noteEl = wrapper?.querySelector('.photo-note');
      const noteText = noteEl?.textContent?.trim();
      const caption = (noteText && noteText !== '+ Notiz') ? noteText : '';
      if (photoId) {
        const photo = await db.photos.get(photoId);
        if (photo?.blob) { showFullscreenPhoto(URL.createObjectURL(photo.blob), true, caption); return; }
      }
      showFullscreenPhoto(img.src, false, caption);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// External Links, Fullscreen, Helpers
// ═══════════════════════════════════════════════════════════════════

function buildExternalLinks(obs) {
  const links = [];
  const sciName = obs.scientificName;
  const extIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
  if (sciName && !sciName.includes('div.') && !sciName.includes('spp.')) {
    links.push(`<a href="https://www.gbif.org/species/search?q=${encodeURIComponent(sciName)}" target="_blank" rel="noopener" class="ext-link">GBIF ${extIcon}</a>`);
  }
  const catalogEntry = obs.speciesId ? getSpeciesById(obs.speciesId) : null;
  if (catalogEntry?.aragesId) {
    links.push(`<a href="https://atlas.arages.de/species/${catalogEntry.aragesId}" target="_blank" rel="noopener" class="ext-link">AraGes ${extIcon}</a>`);
  }
  return links.join('');
}

function showFullscreenPhoto(src, revokeOnClose = false, caption = '') {
  const overlay = document.createElement('div');
  overlay.className = 'photo-fullscreen';
  overlay.innerHTML = `
    <img src="${src}" alt="Vollbild">
    ${caption ? `<div class="photo-fullscreen-caption">${escapeHtml(caption)}</div>` : ''}
    <button class="photo-fullscreen-close" aria-label="Schließen">×</button>
  `;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('photo-fullscreen-close')) {
      if (revokeOnClose) URL.revokeObjectURL(src);
      overlay.remove();
    }
  });
  document.body.appendChild(overlay);
}

function field(label, value) {
  if (!value && value !== 0) return '';
  return `<div class="detail-field">${label ? `<span class="detail-field-label">${label}</span>` : ''}<span class="detail-field-value">${value}</span></div>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '–';
  try { return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return dateStr; }
}

function truncate(str, len) { return str.length > len ? str.substring(0, len) + '…' : str; }
function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str || ''; return div.innerHTML; }

function destroy() {
  revokeAllPhotoUrls();
  if (_photoUpload) { _photoUpload.destroy(); _photoUpload = null; }
  _container = null;
}

export default { init, destroy };

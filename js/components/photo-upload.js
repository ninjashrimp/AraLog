/* ==========================================================================
   AraLog – Photo Upload Component
   Kamera-Capture + Galerie-Upload, Vorschau mit Thumbnails
   ========================================================================== */

import { processAndSavePhoto, deletePhoto, createPhotoUrl, revokeAllPhotoUrls, extractBasicExif } from '../services/photo-service.js';

/**
 * Erstellt eine Photo-Upload-Area.
 * 
 * @param {Object} options
 * @param {number|null} options.observationId - null bei neuer Beobachtung
 * @param {Array} options.existingPhotos - bereits gespeicherte Fotos [{id, thumbnail}]
 * @param {Function} options.onPhotosChanged - Callback bei Änderungen
 * @param {Function} options.onGpsFound - Callback wenn EXIF-GPS gefunden: ({lat, lng, date}) => void
 * @param {string} options.mode - 'form' (im Formular) oder 'detail' (nachträglich)
 * @returns {Object} { el, addPhotosFromFiles, getPhotoIds, setObservationId, destroy }
 */
export function createPhotoUpload({ observationId = null, existingPhotos = [], onPhotosChanged = null, onGpsFound = null, onNoGps = null, mode = 'form' } = {}) {
  let _observationId = observationId;
  let _photoEntries = []; // [{id, thumbnailUrl, status: 'saved'|'pending'|'processing'}]
  let _pendingFiles = [];  // Files die noch keine observationId haben
  let _destroyed = false;

  // ── DOM aufbauen ──
  const el = document.createElement('div');
  el.className = 'photo-upload-area';

  // Bestehende Fotos anzeigen
  existingPhotos.forEach(p => {
    const url = createPhotoUrl(p.thumbnail || p.blob);
    _photoEntries.push({ id: p.id, thumbnailUrl: url, status: 'saved' });
  });

  render();

  // ── Rendering ──
  function render() {
    if (_destroyed) return;

    const previews = _photoEntries.map((entry, idx) => `
      <div class="photo-preview" data-idx="${idx}">
        <img src="${entry.thumbnailUrl}" alt="Foto ${idx + 1}">
        ${entry.status === 'processing' ? `
          <div class="photo-processing">
            <div class="spinner-small"></div>
          </div>
        ` : `
          <button type="button" class="photo-remove" data-idx="${idx}" aria-label="Foto entfernen">×</button>
        `}
      </div>
    `).join('');

    el.innerHTML = `
      ${previews}
      <label class="photo-upload-btn" data-action="camera" title="Foto aufnehmen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <span>Kamera</span>
        <input type="file" accept="image/*" capture="environment" hidden data-input="camera">
      </label>
      <label class="photo-upload-btn" data-action="gallery" title="Aus Galerie wählen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="m21 15-5-5L5 21"/>
        </svg>
        <span>Galerie</span>
        <input type="file" accept="image/*" multiple hidden data-input="gallery">
      </label>
    `;

    // Event-Listener
    el.querySelectorAll('input[type="file"]').forEach(input => {
      input.addEventListener('change', handleFileInput);
    });

    el.querySelectorAll('.photo-remove').forEach(btn => {
      btn.addEventListener('click', handleRemove);
    });
  }

  // ── File Input Handler ──
  async function handleFileInput(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    await addPhotosFromFiles(files);
  }

  // ── Fotos hinzufügen ──
  async function addPhotosFromFiles(files) {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      // Sofort Vorschau zeigen (mit Original als temp Thumbnail)
      const tempUrl = URL.createObjectURL(file);
      const idx = _photoEntries.length;
      _photoEntries.push({ id: null, thumbnailUrl: tempUrl, status: 'processing' });
      render();

      try {
        if (_observationId) {
          // Direkt verarbeiten und speichern
          const result = await processAndSavePhoto(file, {
            observationId: _observationId,
            type: 'Spinne',
          });

          // GPS aus EXIF melden
          if (result.exif?.lat && result.exif?.lng) {
            onGpsFound?.({ lat: result.exif.lat, lng: result.exif.lng, date: result.exif.date });
          } else {
            onNoGps?.();
          }

          // Temp URL freigeben, Thumbnail-URL setzen
          URL.revokeObjectURL(tempUrl);
          const thumbUrl = createPhotoUrl(
            (await getPhotoThumbnail(result.id))
          );

          if (!_destroyed) {
            _photoEntries[idx] = { id: result.id, thumbnailUrl: thumbUrl, status: 'saved' };
            render();
            notifyChanged();
          }
        } else {
          // Observation existiert noch nicht → File merken
          _pendingFiles.push({ file, idx });
          _photoEntries[idx].status = 'pending';
          render();

          // EXIF trotzdem auslesen für GPS-Hinweis
          try {
            const exif = await extractBasicExif(file);
            if (exif?.lat && exif?.lng) {
              onGpsFound?.({ lat: exif.lat, lng: exif.lng, date: exif.date });
            } else {
              onNoGps?.();
            }
          } catch (e) { /* ignore */ }
        }
      } catch (err) {
        console.error('[PhotoUpload] Fehler:', err);
        URL.revokeObjectURL(tempUrl);
        _photoEntries.splice(idx, 1);
        render();
        window.AraLog?.showToast('Foto konnte nicht verarbeitet werden', 'error');
      }
    }
  }

  // ── Foto entfernen ──
  async function handleRemove(e) {
    e.preventDefault();
    e.stopPropagation();
    const idx = parseInt(e.currentTarget.dataset.idx);
    const entry = _photoEntries[idx];
    if (!entry) return;

    if (entry.id && _observationId) {
      try {
        await deletePhoto(entry.id, _observationId);
      } catch (err) {
        console.error('[PhotoUpload] Löschfehler:', err);
      }
    }

    // Pending file auch entfernen
    _pendingFiles = _pendingFiles.filter(p => p.idx !== idx);

    _photoEntries.splice(idx, 1);

    // Pending-Indizes aktualisieren
    _pendingFiles.forEach(p => { if (p.idx > idx) p.idx--; });

    render();
    notifyChanged();
  }

  // ── Pending Files verarbeiten (nach Speichern der Observation) ──
  async function processPendingPhotos(obsId) {
    _observationId = obsId;

    for (const pending of _pendingFiles) {
      const entry = _photoEntries[pending.idx];
      if (!entry) continue;

      entry.status = 'processing';
      render();

      try {
        const result = await processAndSavePhoto(pending.file, {
          observationId: obsId,
          type: 'Spinne',
        });

        // Temp URL freigeben
        if (entry.thumbnailUrl) URL.revokeObjectURL(entry.thumbnailUrl);

        const thumbUrl = createPhotoUrl(
          (await getPhotoThumbnail(result.id))
        );

        entry.id = result.id;
        entry.thumbnailUrl = thumbUrl;
        entry.status = 'saved';
      } catch (err) {
        console.error('[PhotoUpload] Pending-Foto Fehler:', err);
        entry.status = 'saved'; // Still show it, even if failed
      }
    }

    _pendingFiles = [];
    render();
  }

  // ── Helpers ──
  async function getPhotoThumbnail(photoId) {
    const photo = await window.Dexie && (await import('../db.js')).default.photos.get(photoId);
    return photo?.thumbnail || photo?.blob;
  }

  function getPhotoIds() {
    return _photoEntries.filter(e => e.id).map(e => e.id);
  }

  function getPhotoCount() {
    return _photoEntries.length;
  }

  function hasPendingPhotos() {
    return _pendingFiles.length > 0;
  }

  function setObservationId(id) {
    _observationId = id;
  }

  function notifyChanged() {
    onPhotosChanged?.({
      photoIds: getPhotoIds(),
      count: getPhotoCount(),
      hasPending: hasPendingPhotos(),
    });
  }

  function destroy() {
    _destroyed = true;
    revokeAllPhotoUrls();
    _pendingFiles = [];
    _photoEntries = [];
    el.innerHTML = '';
  }

  return {
    el,
    addPhotosFromFiles,
    processPendingPhotos,
    getPhotoIds,
    getPhotoCount,
    hasPendingPhotos,
    setObservationId,
    destroy,
  };
}

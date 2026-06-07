/* ==========================================================================
   AraLog – Observation Form View
   New / Edit observation, with follow-up support
   ========================================================================== */

import db, { createObservationTemplate } from '../db.js';
import { createSpeciesPicker } from '../components/species-picker.js';
import { createTagInput, createToggleGroup } from '../components/tag-input.js';
import { createPhotoUpload } from '../components/photo-upload.js';
import { getPhotosForObservation } from '../services/photo-service.js';
import { reverseGeocode } from '../services/geocode-service.js';
import {
  CONFIDENCE, EVIDENCE_TYPE, LIFE_STAGE, SEX,
  POSITION, APPROACH_REACTION, BEHAVIOR_TAGS, INTERACTION_TAGS,
  WEB_TYPE, WEB_CONDITION, COCOON_CONDITION,
  HABITAT_GROUPS, WEATHER_GROUPS, PHOTO_TYPE, QUICK_TAGS,
} from '../data/enums.js';

let _container = null;
let _isEditing = false;
let _observationId = null;
let _data = null;
let _components = [];
let _photoUpload = null;
let _existingPhotos = [];

async function init(container, params) {
  _container = container;
  _isEditing = !!params?.id;
  _observationId = params?.id ? parseInt(params.id) : null;
  _components = [];

  if (_isEditing && _observationId) {
    _data = await db.observations.get(_observationId);
    if (!_data) {
      container.innerHTML = `<div class="view-container"><div class="empty-state"><h3>Beobachtung nicht gefunden</h3><a href="#" class="btn btn-secondary" style="margin-top:var(--space-lg)">Zur Liste</a></div></div>`;
      return;
    }
  } else {
    _data = createObservationTemplate();

    // ── Prefill from follow-up button ──
    const prefill = window.AraLog?._prefill;
    if (prefill) {
      _data.parentObservationId = prefill.parentObservationId || null;
      _data.speciesName = prefill.speciesName || '';
      _data.scientificName = prefill.scientificName || '';
      _data.speciesId = prefill.speciesId || null;
      _data.family = prefill.family || '';
      _data.lat = prefill.lat || null;
      _data.lng = prefill.lng || null;
      _data.locationName = prefill.locationName || '';
      _data.confidence = prefill.confidence || 'unsicher';
      delete window.AraLog._prefill;
    }
  }

  _existingPhotos = [];
  if (_isEditing && _observationId) {
    try { _existingPhotos = await getPhotosForObservation(_observationId); }
    catch (e) { console.warn('[Form] Photo load:', e); }
  }

  const isFollowUp = !_isEditing && _data.parentObservationId;

  container.innerHTML = `
    <div class="view-container" data-unsaved="false">
      <form id="obs-form" novalidate>

        ${isFollowUp ? `
          <div class="exif-gps-bar" style="margin-bottom:var(--space-lg);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>
            <span>Folgebeobachtung zu <strong>${escapeHtml(_data.speciesName)}</strong></span>
          </div>
        ` : ''}

        <!-- ════════════ ERFASSUNG ════════════ -->
        <div class="form-section">
          <div class="form-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Erfassung
            <span class="auto-filled">automatisch</span>
          </div>

          <div style="display:flex; gap:var(--space-md);">
            <div class="form-group" style="flex:1">
              <label class="form-label">Datum</label>
              <input type="date" class="form-input" id="f-date" value="${_data.date}">
            </div>
            <div class="form-group" style="flex:1">
              <label class="form-label">Uhrzeit</label>
              <input type="time" class="form-input" id="f-time" value="${_data.time}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">GPS-Position</label>
            <div style="display:flex; gap:var(--space-sm); align-items:center;">
              <input type="text" class="form-input" id="f-coords"
                     value="${_data.lat && _data.lng ? `${_data.lat.toFixed(6)}, ${_data.lng.toFixed(6)}` : ''}"
                     placeholder="52.1234, 13.5678 oder GPS nutzen">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-gps" title="GPS aktualisieren">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
              </button>
            </div>
            <div class="gps-status" id="gps-status"><span class="gps-dot none"></span><span>${_data.lat ? 'Position gesetzt' : 'GPS wird gesucht...'}</span></div>
          </div>

          <div class="form-group">
            <label class="form-label">Ort</label>
            <div style="display:flex; gap:var(--space-sm); align-items:center;">
              <input type="text" class="form-input" id="f-location-name" value="${escapeHtml(_data.locationName || '')}" placeholder="Wird aus Koordinaten ermittelt...">
              <div class="geocode-spinner" id="geocode-spinner" style="display:none;"><div class="spinner-small"></div></div>
            </div>
          </div>
        </div>

        <!-- ════════════ ARTBESTIMMUNG ════════════ -->
        <div class="form-section">
          <div class="form-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            Artbestimmung
          </div>
          <div class="form-group"><label class="form-label">Art</label><div id="species-picker-mount"></div></div>
          <div class="form-group"><label class="form-label">Bestimmungssicherheit</label><div id="confidence-mount"></div></div>
        </div>

        <!-- ════════════ FUND-KLASSIFIKATION ════════════ -->
        <div class="form-section">
          <div class="form-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
            Fund-Klassifikation
          </div>
          <div class="form-group"><label class="form-label">Fundtyp</label><div id="evidence-type-mount"></div></div>
          <div id="spider-only-fields">
            <div class="form-group"><label class="form-label">Lebensstadium</label><div id="life-stage-mount"></div></div>
            <div class="form-group"><label class="form-label">Geschlecht</label><div id="sex-mount"></div></div>
          </div>
        </div>

        <!-- Collapsible sections (unchanged) -->
        <div class="collapsible" id="section-behavior"><div class="collapsible-header" data-toggle="section-behavior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg><h3>Verhalten & Position</h3><svg class="collapsible-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div><div class="collapsible-body"><div class="form-group"><label class="form-label">Verhalten</label><div id="behavior-tags-mount"></div></div><div class="form-group"><label class="form-label">Position / Fundort</label><div id="position-mount"></div><input type="text" class="form-input" id="f-position-freetext" placeholder="Sonstiges (Freitext)..." style="margin-top:var(--space-sm);${_data.position !== 'Sonstiges' ? 'display:none;' : ''}" value="${escapeHtml(_data.positionFreetext || '')}"></div><div class="form-group"><label class="form-label">Spinne sichtbar?</label><div id="spider-visible-mount"></div></div><div class="form-group"><label class="form-label">Reaktion auf Annäherung</label><div id="approach-mount"></div></div></div></div>

        <div class="collapsible" id="section-interactions"><div class="collapsible-header" data-toggle="section-interactions"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><h3>Interaktionen</h3><svg class="collapsible-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div><div class="collapsible-body"><div class="form-group"><div id="interaction-tags-mount"></div></div></div></div>

        <div class="collapsible" id="section-web"><div class="collapsible-header" data-toggle="section-web"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20M2 12h20"/></svg><h3>Netz / Gespinst</h3><svg class="collapsible-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div><div class="collapsible-body"><div class="form-group"><label class="form-label">Netztyp</label><div id="web-type-mount"></div></div><div class="form-group"><label class="form-label">Zustand Netz/Gespinst</label><div id="web-condition-mount"></div></div><div class="form-group"><label class="form-label">Zustand Kokon</label><div id="cocoon-condition-mount"></div></div></div></div>

        <div class="collapsible" id="section-habitat"><div class="collapsible-header" data-toggle="section-habitat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><h3>Habitat</h3><svg class="collapsible-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div><div class="collapsible-body"><div class="form-group"><label class="form-label">Lebensraum</label><div id="habitat-tags-mount"></div></div><div class="form-group"><label class="form-label">Pflanze / Substrat</label><input type="text" class="form-input" id="f-plant" placeholder="z.B. Brennnessel, Eiche, Mauerwerk..." value="${escapeHtml(_data.plant || '')}"></div><div class="form-group"><label class="form-label">Höhe über Boden</label><input type="text" class="form-input" id="f-height" placeholder="z.B. Bodennah, 1.5m, Deckenhöhe..." value="${escapeHtml(_data.heightAboveGround || '')}"></div></div></div>

        <div class="collapsible" id="section-weather"><div class="collapsible-header" data-toggle="section-weather"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg><h3>Umgebung</h3><svg class="collapsible-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div><div class="collapsible-body"><div class="form-group"><label class="form-label">Wetter</label><div id="weather-tags-mount"></div></div><div class="form-group"><label class="form-label">Temperatur (°C)</label><input type="number" class="form-input" id="f-temperature" step="0.5" min="-30" max="50" placeholder="z.B. 18.5" value="${_data.temperature != null ? _data.temperature : ''}"></div></div></div>

        <!-- Fotos -->
        <div class="form-section"><div class="form-section-header"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>Fotos<span class="photo-count" id="photo-count"></span></div><div id="photo-upload-mount"></div><div id="exif-gps-hint"></div></div>

        <!-- Notizen & Tags -->
        <div class="form-section"><div class="form-section-header"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Notizen & Tags</div><div class="form-group"><label class="form-label">Notizen</label><textarea class="form-input form-textarea" id="f-notes" rows="3" placeholder="Freitext-Beobachtungen...">${escapeHtml(_data.notes || '')}</textarea></div><div class="form-group"><label class="form-label">Tags</label><div id="quick-tags-mount"></div></div></div>

        <!-- Save -->
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-lg btn-block" id="btn-save">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            ${_isEditing ? 'Aktualisieren' : 'Speichern'}
          </button>
          <a href="#${_isEditing ? 'view/' + _observationId : ''}" class="btn btn-secondary btn-block">Abbrechen</a>
        </div>
      </form>
    </div>
  `;

  mountComponents();
  setupCollapsibles();
  setupGPS();
  setupFormSubmit();
}

function mountComponents() {
  const speciesPicker = createSpeciesPicker(_container.querySelector('#species-picker-mount'), {
    initialValue: { speciesName: _data.speciesName || '', scientificName: _data.scientificName || '', speciesId: _data.speciesId || null },
    onChange: (val) => { _data.speciesName = val.speciesName; _data.scientificName = val.scientificName; _data.speciesId = val.speciesId; _data.family = val.family || ''; markUnsaved(); },
  });
  _components.push(speciesPicker);

  _components.push(createToggleGroup(_container.querySelector('#confidence-mount'), { values: CONFIDENCE, selected: _data.confidence || '', onChange: (val) => { _data.confidence = val || ''; markUnsaved(); } }));
  _components.push(createToggleGroup(_container.querySelector('#evidence-type-mount'), { values: EVIDENCE_TYPE, selected: _data.evidenceType || '', onChange: (val) => { _data.evidenceType = val || ''; markUnsaved(); } }));
  _components.push(createToggleGroup(_container.querySelector('#life-stage-mount'), { values: LIFE_STAGE, selected: _data.lifeStage || '', onChange: (val) => { _data.lifeStage = val || ''; markUnsaved(); } }));
  _components.push(createToggleGroup(_container.querySelector('#sex-mount'), { values: SEX, selected: _data.sex || '', onChange: (val) => { _data.sex = val || ''; markUnsaved(); } }));
  _components.push(createTagInput(_container.querySelector('#behavior-tags-mount'), { tags: BEHAVIOR_TAGS, selected: _data.behaviorTags || [], multiple: true, onChange: (tags) => { _data.behaviorTags = tags; markUnsaved(); } }));
  _components.push(createToggleGroup(_container.querySelector('#position-mount'), { values: POSITION, selected: _data.position || '', onChange: (val) => { _data.position = val || ''; const ft = _container?.querySelector('#f-position-freetext'); if (ft) ft.style.display = val === 'Sonstiges' ? '' : 'none'; markUnsaved(); } }));
  _components.push(createToggleGroup(_container.querySelector('#spider-visible-mount'), { values: ['Ja', 'Nein'], selected: _data.spiderVisible === true ? 'Ja' : _data.spiderVisible === false ? 'Nein' : '', onChange: (val) => { _data.spiderVisible = val === 'Ja' ? true : val === 'Nein' ? false : null; markUnsaved(); } }));
  _components.push(createToggleGroup(_container.querySelector('#approach-mount'), { values: APPROACH_REACTION, selected: _data.approachReaction || '', onChange: (val) => { _data.approachReaction = val || ''; markUnsaved(); } }));
  _components.push(createTagInput(_container.querySelector('#interaction-tags-mount'), { tags: INTERACTION_TAGS, selected: _data.interactionTags || [], multiple: true, onChange: (tags) => { _data.interactionTags = tags; markUnsaved(); } }));
  _components.push(createToggleGroup(_container.querySelector('#web-type-mount'), { values: WEB_TYPE, selected: _data.webType || '', onChange: (val) => { _data.webType = val || ''; markUnsaved(); } }));
  _components.push(createToggleGroup(_container.querySelector('#web-condition-mount'), { values: WEB_CONDITION, selected: _data.webCondition || '', onChange: (val) => { _data.webCondition = val || ''; markUnsaved(); } }));
  _components.push(createToggleGroup(_container.querySelector('#cocoon-condition-mount'), { values: COCOON_CONDITION, selected: _data.cocoonCondition || '', onChange: (val) => { _data.cocoonCondition = val || ''; markUnsaved(); } }));
  _components.push(createTagInput(_container.querySelector('#habitat-tags-mount'), { groups: HABITAT_GROUPS, selected: _data.habitatTags || [], multiple: true, onChange: (tags) => { _data.habitatTags = tags; markUnsaved(); } }));
  _components.push(createTagInput(_container.querySelector('#weather-tags-mount'), { groups: WEATHER_GROUPS, selected: _data.weatherTags || [], multiple: true, onChange: (tags) => { _data.weatherTags = tags; markUnsaved(); } }));
  _components.push(createTagInput(_container.querySelector('#quick-tags-mount'), { tags: QUICK_TAGS, selected: _data.tags || [], multiple: true, allowFreetext: true, freetextPlaceholder: 'Eigenen Tag...', onChange: (tags) => { _data.tags = tags; markUnsaved(); } }));

  const photoMount = _container.querySelector('#photo-upload-mount');
  if (photoMount) {
    _photoUpload = createPhotoUpload({ observationId: _isEditing ? _observationId : null, existingPhotos: _existingPhotos || [], mode: 'form',
      onPhotosChanged: ({ count }) => { const c = _container?.querySelector('#photo-count'); if (c) c.textContent = count > 0 ? `(${count})` : ''; markUnsaved(); },
      onGpsFound: ({ lat, lng }) => { showExifGpsHint(lat, lng); },
      onNoGps: () => { showNoGpsHint(); },
    });
    photoMount.appendChild(_photoUpload.el);
    const countEl = _container?.querySelector('#photo-count');
    if (countEl && _existingPhotos?.length) countEl.textContent = `(${_existingPhotos.length})`;
  }
}

function setupCollapsibles() { _container?.querySelectorAll('.collapsible-header').forEach(h => { h.addEventListener('click', () => h.closest('.collapsible')?.classList.toggle('open')); }); }

function setupGPS() {
  const coordsInput = _container?.querySelector('#f-coords');
  const gpsStatus = _container?.querySelector('#gps-status');
  const gpsBtn = _container?.querySelector('#btn-gps');

  function requestGPS() {
    if (!navigator.geolocation) { updateGPSStatus('none', 'GPS nicht verfügbar'); return; }
    updateGPSStatus('none', 'Suche Position...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        _data.lat = pos.coords.latitude; _data.lng = pos.coords.longitude;
        if (coordsInput) coordsInput.value = `${_data.lat.toFixed(6)}, ${_data.lng.toFixed(6)}`;
        const acc = pos.coords.accuracy;
        const quality = acc < 20 ? 'good' : acc < 100 ? 'fair' : 'poor';
        updateGPSStatus(quality, `${acc < 20 ? 'Sehr gut' : acc < 100 ? 'OK' : 'Ungenau'} (±${Math.round(acc)}m)`);
        markUnsaved(); fillLocationIfEmpty(_data.lat, _data.lng);
      },
      (err) => { console.warn('[GPS]', err.message); updateGPSStatus('none', 'GPS-Fehler – Position manuell setzen'); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }
  function updateGPSStatus(q, t) { if (gpsStatus) gpsStatus.innerHTML = `<span class="gps-dot ${q}"></span><span>${t}</span>`; }
  if (!_isEditing && !_data.lat) requestGPS(); else if (_data.lat) updateGPSStatus('good', 'Position gesetzt');
  gpsBtn?.addEventListener('click', requestGPS);

  coordsInput?.addEventListener('change', () => {
    const raw = coordsInput.value.trim();
    if (!raw) { _data.lat = null; _data.lng = null; updateGPSStatus('none', 'Keine Position'); markUnsaved(); return; }
    const match = raw.match(/^\s*(-?\d+[.,]\d+)\s*[,;\s]\s*(-?\d+[.,]\d+)\s*$/);
    if (match) {
      const lat = parseFloat(match[1].replace(',', '.')), lng = parseFloat(match[2].replace(',', '.'));
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        _data.lat = lat; _data.lng = lng; coordsInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        updateGPSStatus('good', 'Manuell gesetzt'); markUnsaved(); fillLocationIfEmpty(lat, lng); return;
      }
    }
    updateGPSStatus('none', 'Ungültiges Format – z.B. 52.4831, 13.3947');
  });
}

async function fillLocationIfEmpty(lat, lng) {
  const locInput = _container?.querySelector('#f-location-name'); if (!locInput || locInput.value.trim()) return;
  const spinner = _container?.querySelector('#geocode-spinner'); if (spinner) spinner.style.display = '';
  try { const name = await reverseGeocode(lat, lng); if (name && _container) { locInput.value = name; _data.locationName = name; markUnsaved(); } }
  catch (err) { console.warn('[Geocode]', err); }
  finally { if (spinner) spinner.style.display = 'none'; }
}

function showExifGpsHint(lat, lng) {
  const hintEl = _container?.querySelector('#exif-gps-hint'); if (!hintEl) return;
  if (_data.lat && _data.lng && Math.abs(_data.lat - lat) < 0.0001 && Math.abs(_data.lng - lng) < 0.0001) return;
  hintEl.innerHTML = `<div class="exif-gps-bar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>Foto enthält GPS: <strong>${lat.toFixed(5)}, ${lng.toFixed(5)}</strong></span><button type="button" class="btn btn-sm btn-accent" id="btn-adopt-gps">Übernehmen</button><button type="button" class="exif-gps-dismiss" aria-label="Schließen">×</button></div>`;
  hintEl.querySelector('#btn-adopt-gps')?.addEventListener('click', () => {
    _data.lat = lat; _data.lng = lng;
    const ci = _container?.querySelector('#f-coords'); if (ci) ci.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    const gs = _container?.querySelector('#gps-status'); if (gs) gs.innerHTML = '<span class="gps-dot good"></span><span>Aus Foto-EXIF übernommen</span>';
    hintEl.innerHTML = ''; markUnsaved(); window.AraLog?.showToast('GPS-Position aus Foto übernommen', 'success'); fillLocationIfEmpty(lat, lng);
  });
  hintEl.querySelector('.exif-gps-dismiss')?.addEventListener('click', () => { hintEl.innerHTML = ''; });
}

async function showNoGpsHint() {
  const dismissed = await db.settings.get('gpsHintDismissed'); if (dismissed?.value) return;
  const hintEl = _container?.querySelector('#exif-gps-hint'); if (!hintEl || hintEl.innerHTML.trim()) return;
  hintEl.innerHTML = `<div class="exif-gps-bar exif-gps-bar--info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg><span>Foto ohne GPS-Daten. <strong>Tipp:</strong> Über den Dateimanager importieren.</span><button type="button" class="exif-gps-dismiss" aria-label="Schließen">×</button></div>`;
  hintEl.querySelector('.exif-gps-dismiss')?.addEventListener('click', async () => { hintEl.innerHTML = ''; await db.settings.put({ key: 'gpsHintDismissed', value: true }); });
}

function setupFormSubmit() {
  _container?.querySelector('#obs-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    _data.date = _container.querySelector('#f-date')?.value || _data.date;
    _data.time = _container.querySelector('#f-time')?.value || _data.time;
    _data.locationName = _container.querySelector('#f-location-name')?.value?.trim() || '';
    _data.positionFreetext = _container.querySelector('#f-position-freetext')?.value?.trim() || '';
    _data.plant = _container.querySelector('#f-plant')?.value?.trim() || '';
    _data.heightAboveGround = _container.querySelector('#f-height')?.value?.trim() || '';
    _data.notes = _container.querySelector('#f-notes')?.value?.trim() || '';
    const tempVal = _container.querySelector('#f-temperature')?.value;
    _data.temperature = tempVal !== '' && tempVal != null ? parseFloat(tempVal) : null;
    _data.updatedAt = new Date().toISOString();
    if (!_isEditing) _data.createdAt = new Date().toISOString();

    const sp = _components[0];
    if (sp?.getValue) { const sv = sp.getValue(); _data.speciesName = sv.speciesName || _data.speciesName; _data.scientificName = sv.scientificName || _data.scientificName; _data.speciesId = sv.speciesId ?? _data.speciesId; _data.family = sv.family || _data.family; }

    try {
      let id;
      if (_isEditing && _observationId) { await db.observations.update(_observationId, { ..._data }); id = _observationId; }
      else { id = await db.observations.add({ ..._data }); }
      if (_photoUpload?.hasPendingPhotos()) { try { await _photoUpload.processPendingPhotos(id); } catch (err) { console.error('[Form] Photo:', err); } }
      const w = _container?.querySelector('[data-unsaved]'); if (w) w.dataset.unsaved = 'false';
      window.AraLog?.showToast(_isEditing ? 'Beobachtung aktualisiert' : 'Beobachtung gespeichert', 'success');
      window.AraLog?.navigate(`view/${id}`);
    } catch (err) { console.error('[Form] Save:', err); window.AraLog?.showToast('Fehler: ' + err.message, 'error'); }
  });
}

function markUnsaved() { const w = _container?.querySelector('[data-unsaved]'); if (w && w.dataset.unsaved !== 'true') w.dataset.unsaved = 'true'; }
function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str || ''; return div.innerHTML; }

function destroy() {
  _components.forEach(c => { if (typeof c?.destroy === 'function') c.destroy(); }); _components = [];
  if (_photoUpload) { _photoUpload.destroy(); _photoUpload = null; }
  _existingPhotos = []; _container = null; _data = null; _isEditing = false; _observationId = null;
}

export default { init, destroy };

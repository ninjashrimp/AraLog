/* ==========================================================================
   AraLog – Observation Form View (Complete)
   New observation / Edit existing observation
   All fields as defined in the finalized data model
   ========================================================================== */

import db, { createObservationTemplate } from '../db.js';
import { createSpeciesPicker } from '../components/species-picker.js';
import { createTagInput, createToggleGroup } from '../components/tag-input.js';
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

// Component references for cleanup
let _components = [];

async function init(container, params) {
  _container = container;
  _isEditing = !!params?.id;
  _observationId = params?.id ? parseInt(params.id) : null;
  _components = [];

  // Load or create data
  if (_isEditing && _observationId) {
    _data = await db.observations.get(_observationId);
    if (!_data) {
      container.innerHTML = `
        <div class="view-container">
          <div class="empty-state">
            <h3>Beobachtung nicht gefunden</h3>
            <p class="text-muted">ID #${_observationId} existiert nicht.</p>
            <a href="#" class="btn btn-secondary" style="margin-top:var(--space-lg)">Zur Liste</a>
          </div>
        </div>`;
      return;
    }
  } else {
    _data = createObservationTemplate();
  }

  // Render form shell
  container.innerHTML = `
    <div class="view-container" data-unsaved="false">
      <form id="obs-form" novalidate>

        <!-- ════════════ ERFASSUNG (auto) ════════════ -->
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
              <input type="text" class="form-input" id="f-coords" readonly
                     value="${_data.lat && _data.lng ? `${_data.lat.toFixed(6)}, ${_data.lng.toFixed(6)}` : ''}"
                     placeholder="Wird ermittelt...">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-gps" title="GPS aktualisieren">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
                </svg>
              </button>
            </div>
            <div class="gps-status" id="gps-status">
              <span class="gps-dot none"></span>
              <span>${_data.lat ? 'Position gesetzt' : 'GPS wird gesucht...'}</span>
            </div>
          </div>
        </div>

        <!-- ════════════ ARTBESTIMMUNG ════════════ -->
        <div class="form-section">
          <div class="form-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            Artbestimmung
          </div>

          <div class="form-group">
            <label class="form-label">Art</label>
            <div id="species-picker-mount"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Bestimmungssicherheit</label>
            <div id="confidence-mount"></div>
          </div>
        </div>

        <!-- ════════════ FUND-KLASSIFIKATION ════════════ -->
        <div class="form-section">
          <div class="form-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
            Fund-Klassifikation
          </div>

          <div class="form-group">
            <label class="form-label">Fundtyp</label>
            <div id="evidence-type-mount"></div>
          </div>

          <div id="spider-only-fields">
            <div class="form-group">
              <label class="form-label">Lebensstadium</label>
              <div id="life-stage-mount"></div>
            </div>
            <div class="form-group">
              <label class="form-label">Geschlecht</label>
              <div id="sex-mount"></div>
            </div>
          </div>
        </div>

        <!-- ════════════ VERHALTEN & POSITION (collapsible) ════════════ -->
        <div class="collapsible" id="section-behavior">
          <div class="collapsible-header" data-toggle="section-behavior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            <h3>Verhalten & Position</h3>
            <svg class="collapsible-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="collapsible-body">
            <div class="form-group">
              <label class="form-label">Verhalten</label>
              <div id="behavior-tags-mount"></div>
            </div>
            <div class="form-group">
              <label class="form-label">Position / Fundort</label>
              <div id="position-mount"></div>
              <input type="text" class="form-input" id="f-position-freetext"
                     placeholder="Sonstiges (Freitext)..." style="margin-top:var(--space-sm);${_data.position !== 'Sonstiges' ? 'display:none;' : ''}"
                     value="${escapeHtml(_data.positionFreetext || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">Spinne sichtbar?</label>
              <div id="spider-visible-mount"></div>
            </div>
            <div class="form-group">
              <label class="form-label">Reaktion auf Annäherung</label>
              <div id="approach-mount"></div>
            </div>
          </div>
        </div>

        <!-- ════════════ INTERAKTIONEN (collapsible) ════════════ -->
        <div class="collapsible" id="section-interactions">
          <div class="collapsible-header" data-toggle="section-interactions">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <h3>Interaktionen</h3>
            <svg class="collapsible-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="collapsible-body">
            <div class="form-group">
              <div id="interaction-tags-mount"></div>
            </div>
          </div>
        </div>

        <!-- ════════════ NETZ / GESPINST (collapsible) ════════════ -->
        <div class="collapsible" id="section-web">
          <div class="collapsible-header" data-toggle="section-web">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20M2 12h20"/></svg>
            <h3>Netz / Gespinst</h3>
            <svg class="collapsible-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="collapsible-body">
            <div class="form-group">
              <label class="form-label">Netztyp</label>
              <div id="web-type-mount"></div>
            </div>
            <div class="form-group">
              <label class="form-label">Zustand Netz/Gespinst</label>
              <div id="web-condition-mount"></div>
            </div>
            <div class="form-group">
              <label class="form-label">Zustand Kokon</label>
              <div id="cocoon-condition-mount"></div>
            </div>
          </div>
        </div>

        <!-- ════════════ HABITAT (collapsible) ════════════ -->
        <div class="collapsible" id="section-habitat">
          <div class="collapsible-header" data-toggle="section-habitat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <h3>Habitat</h3>
            <svg class="collapsible-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="collapsible-body">
            <div class="form-group">
              <label class="form-label">Lebensraum</label>
              <div id="habitat-tags-mount"></div>
            </div>
            <div class="form-group">
              <label class="form-label">Trägerpflanze</label>
              <input type="text" class="form-input" id="f-plant" value="${escapeHtml(_data.plant || '')}" placeholder="z.B. Brennnessel, Eiche...">
            </div>
            <div class="form-group">
              <label class="form-label">Fundhöhe über Boden</label>
              <input type="text" class="form-input" id="f-height" value="${escapeHtml(_data.heightAboveGround || '')}" placeholder="z.B. ca. 40 cm">
            </div>
          </div>
        </div>

        <!-- ════════════ UMGEBUNG (collapsible) ════════════ -->
        <div class="collapsible" id="section-weather">
          <div class="collapsible-header" data-toggle="section-weather">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/><circle cx="12" cy="12" r="4"/></svg>
            <h3>Umgebung</h3>
            <svg class="collapsible-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="collapsible-body">
            <div class="form-group">
              <label class="form-label">Wetter</label>
              <div id="weather-tags-mount"></div>
            </div>
            <div class="form-group">
              <label class="form-label">Temperatur</label>
              <div class="input-with-unit">
                <input type="number" class="form-input" id="f-temperature"
                       value="${_data.temperature != null ? _data.temperature : ''}"
                       placeholder="—" step="0.5" min="-30" max="50">
                <span class="unit">°C</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ════════════ FOTOS ════════════ -->
        <div class="form-section">
          <div class="form-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            Fotos
          </div>
          <div class="photo-upload-area" id="photo-area">
            <label class="photo-upload-btn" for="photo-input">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M12 5v14m-7-7h14"/></svg>
              Foto
            </label>
            <input type="file" id="photo-input" accept="image/*" capture="environment" multiple hidden>
          </div>
          <p class="form-hint">Foto-Verarbeitung kommt in Schritt 3</p>
        </div>

        <!-- ════════════ NOTIZEN & TAGS (collapsible) ════════════ -->
        <div class="collapsible" id="section-notes">
          <div class="collapsible-header" data-toggle="section-notes">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <h3>Notizen & Tags</h3>
            <svg class="collapsible-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="collapsible-body">
            <div class="form-group">
              <label class="form-label">Notizen</label>
              <textarea class="form-textarea" id="f-notes" placeholder="Freitext-Notizen...">${escapeHtml(_data.notes || '')}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Tags</label>
              <div id="quick-tags-mount"></div>
            </div>
          </div>
        </div>

        <!-- ════════════ SUBMIT ════════════ -->
        <div style="padding: var(--space-xl) 0 var(--space-2xl);">
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="btn-save">
            ${_isEditing ? 'Änderungen speichern' : 'Beobachtung speichern'}
          </button>
        </div>

      </form>
    </div>
  `;

  // ── Mount Components ──
  mountComponents();

  // ── Setup Collapsibles ──
  setupCollapsibles();

  // ── Setup GPS ──
  setupGPS();

  // ── Setup Form Submit ──
  setupFormSubmit();

  // ── Track unsaved changes ──
  container.addEventListener('input', markUnsaved);
  container.addEventListener('click', (e) => {
    if (e.target.closest('.tag, .toggle-option')) markUnsaved();
  });
}

// ═══════════════════════════════════════════════════════════════════
// Component Mounting
// ═══════════════════════════════════════════════════════════════════

function mountComponents() {
  // Species Picker
  const speciesPicker = createSpeciesPicker(
    _container.querySelector('#species-picker-mount'),
    {
      value: _data.speciesName || '',
      speciesId: _data.speciesId,
      onChange: (result) => {
        _data.speciesId = result.speciesId;
        _data.speciesName = result.speciesName;
        _data.scientificName = result.scientificName;
      },
    }
  );
  _components.push(speciesPicker);

  // Confidence
  const confidence = createToggleGroup(
    _container.querySelector('#confidence-mount'),
    {
      values: CONFIDENCE,
      selected: _data.confidence || 'unsicher',
      onChange: (val) => { _data.confidence = val; },
    }
  );
  _components.push(confidence);

  // Evidence Type
  const evidenceType = createToggleGroup(
    _container.querySelector('#evidence-type-mount'),
    {
      values: EVIDENCE_TYPE,
      selected: _data.evidenceType || 'Spinne',
      onChange: (val) => {
        _data.evidenceType = val;
        const spiderFields = _container.querySelector('#spider-only-fields');
        if (spiderFields) {
          spiderFields.classList.toggle('field-disabled', val !== 'Spinne');
        }
      },
    }
  );
  _components.push(evidenceType);

  // Life Stage (spider-only)
  const lifeStage = createToggleGroup(
    _container.querySelector('#life-stage-mount'),
    {
      values: LIFE_STAGE,
      selected: _data.lifeStage || 'Adult',
      onChange: (val) => { _data.lifeStage = val; },
    }
  );
  _components.push(lifeStage);

  // Sex (spider-only)
  const sex = createToggleGroup(
    _container.querySelector('#sex-mount'),
    {
      values: SEX,
      selected: _data.sex || 'Unbekannt',
      onChange: (val) => { _data.sex = val; },
    }
  );
  _components.push(sex);

  // Initial spider-only state
  if (_data.evidenceType !== 'Spinne') {
    _container.querySelector('#spider-only-fields')?.classList.add('field-disabled');
  }

  // Behavior Tags
  const behaviorTags = createTagInput(
    _container.querySelector('#behavior-tags-mount'),
    {
      tags: BEHAVIOR_TAGS,
      selected: _data.behaviorTags || [],
      multiple: true,
      onChange: (tags) => { _data.behaviorTags = tags; },
    }
  );
  _components.push(behaviorTags);

  // Position (single-select + freetext)
  const position = createTagInput(
    _container.querySelector('#position-mount'),
    {
      tags: [...POSITION, 'Sonstiges'],
      selected: _data.position ? [_data.position] : [],
      multiple: false,
      onChange: (tags) => {
        _data.position = tags[0] || '';
        const freetext = _container.querySelector('#f-position-freetext');
        if (freetext) {
          freetext.style.display = tags[0] === 'Sonstiges' ? '' : 'none';
        }
      },
    }
  );
  _components.push(position);

  // Spider Visible
  const spiderVisible = createToggleGroup(
    _container.querySelector('#spider-visible-mount'),
    {
      values: ['Ja', 'Nein'],
      selected: _data.spiderVisible === false ? 'Nein' : 'Ja',
      onChange: (val) => { _data.spiderVisible = val === 'Ja'; },
    }
  );
  _components.push(spiderVisible);

  // Approach Reaction
  const approach = createTagInput(
    _container.querySelector('#approach-mount'),
    {
      tags: APPROACH_REACTION,
      selected: _data.approachReaction ? [_data.approachReaction] : [],
      multiple: false,
      onChange: (tags) => { _data.approachReaction = tags[0] || ''; },
    }
  );
  _components.push(approach);

  // Interaction Tags
  const interactionTags = createTagInput(
    _container.querySelector('#interaction-tags-mount'),
    {
      tags: INTERACTION_TAGS,
      selected: _data.interactionTags || [],
      multiple: true,
      onChange: (tags) => { _data.interactionTags = tags; },
    }
  );
  _components.push(interactionTags);

  // Web Type (single-select)
  const webType = createTagInput(
    _container.querySelector('#web-type-mount'),
    {
      tags: WEB_TYPE,
      selected: _data.webType ? [_data.webType] : [],
      multiple: false,
      onChange: (tags) => { _data.webType = tags[0] || ''; },
    }
  );
  _components.push(webType);

  // Web Condition (single-select)
  const webCondition = createTagInput(
    _container.querySelector('#web-condition-mount'),
    {
      tags: WEB_CONDITION,
      selected: _data.webCondition ? [_data.webCondition] : [],
      multiple: false,
      onChange: (tags) => { _data.webCondition = tags[0] || ''; },
    }
  );
  _components.push(webCondition);

  // Cocoon Condition (single-select)
  const cocoonCondition = createTagInput(
    _container.querySelector('#cocoon-condition-mount'),
    {
      tags: COCOON_CONDITION,
      selected: _data.cocoonCondition ? [_data.cocoonCondition] : [],
      multiple: false,
      onChange: (tags) => { _data.cocoonCondition = tags[0] || ''; },
    }
  );
  _components.push(cocoonCondition);

  // Habitat Tags (grouped, multi-select)
  const habitatTags = createTagInput(
    _container.querySelector('#habitat-tags-mount'),
    {
      groups: HABITAT_GROUPS,
      selected: _data.habitatTags || [],
      multiple: true,
      onChange: (tags) => { _data.habitatTags = tags; },
    }
  );
  _components.push(habitatTags);

  // Weather Tags (grouped, multi-select)
  const weatherTags = createTagInput(
    _container.querySelector('#weather-tags-mount'),
    {
      groups: WEATHER_GROUPS,
      selected: _data.weatherTags || [],
      multiple: true,
      onChange: (tags) => { _data.weatherTags = tags; },
    }
  );
  _components.push(weatherTags);

  // Quick Tags (multi-select + freetext)
  const quickTags = createTagInput(
    _container.querySelector('#quick-tags-mount'),
    {
      tags: QUICK_TAGS,
      selected: _data.tags || [],
      multiple: true,
      allowFreetext: true,
      freetextPlaceholder: 'Eigenen Tag...',
      onChange: (tags) => { _data.tags = tags; },
    }
  );
  _components.push(quickTags);
}

// ═══════════════════════════════════════════════════════════════════
// Collapsible Sections
// ═══════════════════════════════════════════════════════════════════

function setupCollapsibles() {
  _container?.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.closest('.collapsible');
      section?.classList.toggle('open');
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// GPS
// ═══════════════════════════════════════════════════════════════════

function setupGPS() {
  const coordsInput = _container?.querySelector('#f-coords');
  const gpsStatus = _container?.querySelector('#gps-status');
  const gpsBtn = _container?.querySelector('#btn-gps');

  function requestGPS() {
    if (!navigator.geolocation) {
      updateGPSStatus('none', 'GPS nicht verfügbar');
      return;
    }

    updateGPSStatus('none', 'Suche Position...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        _data.lat = pos.coords.latitude;
        _data.lng = pos.coords.longitude;
        if (coordsInput) {
          coordsInput.value = `${_data.lat.toFixed(6)}, ${_data.lng.toFixed(6)}`;
        }

        const acc = pos.coords.accuracy;
        const quality = acc < 20 ? 'good' : acc < 100 ? 'fair' : 'poor';
        const label = acc < 20 ? 'Sehr gut' : acc < 100 ? 'OK' : 'Ungenau';
        updateGPSStatus(quality, `${label} (±${Math.round(acc)}m)`);
        markUnsaved();
      },
      (err) => {
        console.warn('[GPS]', err.message);
        updateGPSStatus('none', 'GPS-Fehler – Position manuell setzen');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  function updateGPSStatus(quality, text) {
    if (gpsStatus) {
      gpsStatus.innerHTML = `<span class="gps-dot ${quality}"></span><span>${text}</span>`;
    }
  }

  // Auto-request for new observations
  if (!_isEditing && !_data.lat) {
    requestGPS();
  } else if (_data.lat) {
    updateGPSStatus('good', 'Position gesetzt');
  }

  gpsBtn?.addEventListener('click', requestGPS);
}

// ═══════════════════════════════════════════════════════════════════
// Form Submit
// ═══════════════════════════════════════════════════════════════════

function setupFormSubmit() {
  const form = _container?.querySelector('#obs-form');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Read text input values
    _data.date = _container.querySelector('#f-date')?.value || _data.date;
    _data.time = _container.querySelector('#f-time')?.value || _data.time;
    _data.positionFreetext = _container.querySelector('#f-position-freetext')?.value?.trim() || '';
    _data.plant = _container.querySelector('#f-plant')?.value?.trim() || '';
    _data.heightAboveGround = _container.querySelector('#f-height')?.value?.trim() || '';
    _data.notes = _container.querySelector('#f-notes')?.value?.trim() || '';

    const tempVal = _container.querySelector('#f-temperature')?.value;
    _data.temperature = tempVal !== '' && tempVal != null ? parseFloat(tempVal) : null;

    _data.updatedAt = new Date().toISOString();
    if (!_isEditing) {
      _data.createdAt = new Date().toISOString();
    }

    // Species picker value
    const speciesPicker = _components[0];
    if (speciesPicker?.getValue) {
      const sv = speciesPicker.getValue();
      _data.speciesName = sv.speciesName || _data.speciesName;
      _data.scientificName = sv.scientificName || _data.scientificName;
      _data.speciesId = sv.speciesId ?? _data.speciesId;
    }

    try {
      let id;
      if (_isEditing && _observationId) {
        await db.observations.update(_observationId, { ..._data });
        id = _observationId;
      } else {
        id = await db.observations.add({ ..._data });
      }

      // Clear unsaved
      const wrapper = _container?.querySelector('[data-unsaved]');
      if (wrapper) wrapper.dataset.unsaved = 'false';

      window.AraLog?.showToast(
        _isEditing ? 'Beobachtung aktualisiert' : 'Beobachtung gespeichert',
        'success'
      );
      window.AraLog?.navigate(`view/${id}`);
    } catch (err) {
      console.error('[Form] Save error:', err);
      window.AraLog?.showToast('Fehler beim Speichern: ' + err.message, 'error');
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function markUnsaved() {
  const wrapper = _container?.querySelector('[data-unsaved]');
  if (wrapper && wrapper.dataset.unsaved !== 'true') {
    wrapper.dataset.unsaved = 'true';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function destroy() {
  _components.forEach(c => {
    if (typeof c?.destroy === 'function') c.destroy();
  });
  _components = [];
  _container = null;
  _data = null;
  _isEditing = false;
  _observationId = null;
}

export default { init, destroy };

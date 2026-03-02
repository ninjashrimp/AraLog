/* ==========================================================================
   AraLog – Observation Form View (Stub)
   New observation / Edit existing observation
   ========================================================================== */

import db, { createObservationTemplate } from '../db.js';

let _container = null;
let _isEditing = false;
let _observationId = null;

async function init(container, params) {
  _container = container;
  _isEditing = !!params?.id;
  _observationId = params?.id ? parseInt(params.id) : null;

  let data;
  if (_isEditing && _observationId) {
    data = await db.observations.get(_observationId);
    if (!data) {
      container.innerHTML = `
        <div class="view-container">
          <div class="empty-state">
            <h3>Beobachtung nicht gefunden</h3>
            <p class="text-muted">Die Beobachtung #${_observationId} existiert nicht.</p>
          </div>
        </div>`;
      return;
    }
  } else {
    data = createObservationTemplate();
  }

  container.innerHTML = `
    <div class="view-container" data-unsaved="false">
      <h2>${_isEditing ? 'Beobachtung bearbeiten' : 'Neue Beobachtung'}</h2>

      <form id="obs-form" novalidate>

        <!-- Zeitpunkt (auto) -->
        <div class="form-section">
          <div class="form-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Erfassung
            <span class="auto-filled">automatisch</span>
          </div>
          <div style="display: flex; gap: var(--space-md);">
            <div class="form-group" style="flex:1;">
              <label class="form-label">Datum</label>
              <input type="date" class="form-input" id="f-date" value="${data.date}">
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label">Uhrzeit</label>
              <input type="time" class="form-input" id="f-time" value="${data.time}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">GPS-Position</label>
            <div style="display: flex; gap: var(--space-sm); align-items: center;">
              <input type="text" class="form-input" id="f-coords" readonly
                     value="${data.lat && data.lng ? `${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}` : 'Wird ermittelt...'}"
                     placeholder="Wird ermittelt...">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-gps">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
                </svg>
              </button>
            </div>
            <div class="gps-status" id="gps-status">
              <span class="gps-dot none"></span>
              <span>GPS wird gesucht...</span>
            </div>
          </div>
        </div>

        <!-- Artbestimmung -->
        <div class="form-section">
          <div class="form-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            Artbestimmung
          </div>
          <div class="form-group">
            <label class="form-label">Art</label>
            <div class="species-picker-wrapper">
              <input type="text" class="form-input" id="f-species"
                     placeholder="Art suchen..."
                     value="${data.speciesName || ''}"
                     autocomplete="off">
              <div class="species-dropdown" id="species-dropdown"></div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Bestimmungssicherheit</label>
            <div class="toggle-group" id="f-confidence">
              <div class="toggle-option ${data.confidence === 'sicher' ? 'selected' : ''}"
                   data-value="sicher">sicher</div>
              <div class="toggle-option ${data.confidence === 'wahrscheinlich' ? 'selected' : ''}"
                   data-value="wahrscheinlich">wahrscheinlich</div>
              <div class="toggle-option ${data.confidence === 'unsicher' ? 'selected' : ''}"
                   data-value="unsicher">unsicher</div>
            </div>
          </div>
        </div>

        <!-- Fund-Klassifikation -->
        <div class="form-section">
          <div class="form-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            Fund-Klassifikation
          </div>
          <div class="form-group">
            <label class="form-label">Fundtyp</label>
            <div class="toggle-group" id="f-evidenceType">
              ${['Spinne','Kokon','Brutgespinst','Exuvie','Nur Netz'].map(v =>
                `<div class="toggle-option ${data.evidenceType === v ? 'selected' : ''}" data-value="${v}">${v}</div>`
              ).join('')}
            </div>
          </div>
          <div id="spider-fields" class="${data.evidenceType !== 'Spinne' ? 'field-disabled' : ''}">
            <div class="form-group">
              <label class="form-label">Lebensstadium</label>
              <div class="toggle-group" id="f-lifeStage">
                ${['Adult','Subadult','Juvenil'].map(v =>
                  `<div class="toggle-option ${data.lifeStage === v ? 'selected' : ''}" data-value="${v}">${v}</div>`
                ).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Geschlecht</label>
              <div class="toggle-group" id="f-sex">
                ${['Weiblich','Männlich','Unbekannt'].map(v =>
                  `<div class="toggle-option ${data.sex === v ? 'selected' : ''}" data-value="${v}">${v}</div>`
                ).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Fotos (immer sichtbar) -->
        <div class="form-section">
          <div class="form-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            Fotos
          </div>
          <div class="photo-upload-area" id="photo-area">
            <label class="photo-upload-btn" for="photo-input">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m-7-7h14"/></svg>
              Foto
            </label>
            <input type="file" id="photo-input" accept="image/*" capture="environment" multiple hidden>
          </div>
        </div>

        <!-- Notizen -->
        <div class="form-section">
          <div class="form-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Notizen
          </div>
          <div class="form-group">
            <textarea class="form-textarea" id="f-notes" placeholder="Freitext-Notizen...">${data.notes || ''}</textarea>
          </div>
        </div>

        <!-- Submit -->
        <button type="submit" class="btn btn-primary btn-block btn-lg" id="btn-save">
          ${_isEditing ? 'Speichern' : 'Beobachtung speichern'}
        </button>

      </form>
    </div>
  `;

  // Setup event handlers
  setupToggleGroups();
  setupEvidenceTypeLogic();
  setupGPS(data);
  setupFormSubmit(data);
}

function setupToggleGroups() {
  _container?.querySelectorAll('.toggle-group').forEach(group => {
    group.addEventListener('click', (e) => {
      const option = e.target.closest('.toggle-option');
      if (!option) return;

      group.querySelectorAll('.toggle-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      markUnsaved();
    });
  });
}

function setupEvidenceTypeLogic() {
  const etGroup = _container?.querySelector('#f-evidenceType');
  const spiderFields = _container?.querySelector('#spider-fields');
  if (!etGroup || !spiderFields) return;

  etGroup.addEventListener('click', () => {
    const selected = etGroup.querySelector('.toggle-option.selected');
    if (selected?.dataset.value === 'Spinne') {
      spiderFields.classList.remove('field-disabled');
    } else {
      spiderFields.classList.add('field-disabled');
    }
  });
}

function setupGPS(data) {
  const coordsInput = _container?.querySelector('#f-coords');
  const gpsStatus = _container?.querySelector('#gps-status');
  const gpsBtn = _container?.querySelector('#btn-gps');

  function requestGPS() {
    if (!navigator.geolocation) {
      if (gpsStatus) gpsStatus.innerHTML = '<span class="gps-dot none"></span><span>GPS nicht verfügbar</span>';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        data.lat = pos.coords.latitude;
        data.lng = pos.coords.longitude;
        if (coordsInput) coordsInput.value = `${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`;

        const accuracy = pos.coords.accuracy;
        const quality = accuracy < 20 ? 'good' : accuracy < 100 ? 'fair' : 'poor';
        if (gpsStatus) {
          gpsStatus.innerHTML = `<span class="gps-dot ${quality}"></span><span>${Math.round(accuracy)}m Genauigkeit</span>`;
        }
        markUnsaved();
      },
      (err) => {
        console.warn('[GPS] Error:', err.message);
        if (gpsStatus) gpsStatus.innerHTML = '<span class="gps-dot none"></span><span>GPS-Fehler – Position manuell setzen</span>';
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  // Auto-request GPS for new observations
  if (!_isEditing && !data.lat) {
    requestGPS();
  }

  gpsBtn?.addEventListener('click', requestGPS);
}

function setupFormSubmit(data) {
  const form = _container?.querySelector('#obs-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Gather form values
    const getValue = (id) => _container?.querySelector(`#${id}`)?.value?.trim() || '';
    const getToggle = (id) => _container?.querySelector(`#${id} .toggle-option.selected`)?.dataset?.value || '';

    const observation = {
      ...data,
      date: getValue('f-date'),
      time: getValue('f-time'),
      updatedAt: new Date().toISOString(),

      speciesName: getValue('f-species'),
      confidence: getToggle('f-confidence'),

      evidenceType: getToggle('f-evidenceType'),
      lifeStage: getToggle('f-lifeStage'),
      sex: getToggle('f-sex'),

      notes: getValue('f-notes'),
    };

    // Remove createdAt for edits
    if (!_isEditing) {
      observation.createdAt = new Date().toISOString();
    }

    try {
      let id;
      if (_isEditing && _observationId) {
        await db.observations.update(_observationId, observation);
        id = _observationId;
      } else {
        id = await db.observations.add(observation);
      }

      // Clear unsaved flag
      const wrapper = _container?.querySelector('[data-unsaved]');
      if (wrapper) wrapper.dataset.unsaved = 'false';

      window.AraLog?.showToast(
        _isEditing ? 'Beobachtung aktualisiert' : 'Beobachtung gespeichert',
        'success'
      );

      window.AraLog?.navigate(`view/${id}`);
    } catch (err) {
      console.error('[Form] Save error:', err);
      window.AraLog?.showToast('Fehler beim Speichern', 'error');
    }
  });
}

function markUnsaved() {
  const wrapper = _container?.querySelector('[data-unsaved]');
  if (wrapper) wrapper.dataset.unsaved = 'true';
}

function destroy() {
  _container = null;
  _isEditing = false;
  _observationId = null;
}

export default { init, destroy };

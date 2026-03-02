/* ==========================================================================
   AraLog – Map View
   Full-screen map with observation markers and clustering
   ========================================================================== */

import db, { getSetting } from '../db.js';

let _container = null;
let _map = null;
let _clusterGroup = null;

async function init(container, params) {
  _container = container;

  const mapStyle = await getSetting('mapStyle', 'standard');

  container.innerHTML = `
    <div class="map-view-container">
      <div id="map-canvas"></div>
      <div class="map-layer-control">
        <button class="map-layer-btn ${mapStyle === 'standard' ? 'active' : ''}" data-style="standard">Standard</button>
        <button class="map-layer-btn ${mapStyle === 'topo' ? 'active' : ''}" data-style="topo">Topo</button>
      </div>
    </div>
  `;

  // Wait for DOM
  await new Promise(r => requestAnimationFrame(r));

  const mapEl = container.querySelector('#map-canvas');
  if (!mapEl) return;

  // Initialize Leaflet
  const center = await getSetting('defaultMapCenter', { lat: 52.52, lng: 13.40 });
  const zoom = await getSetting('defaultMapZoom', 11);

  _map = L.map(mapEl, {
    zoomControl: true,
    attributionControl: true,
  }).setView([center.lat, center.lng], zoom);

  // Tile layers
  const layers = {
    standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }),
    topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenTopoMap',
      maxZoom: 17,
    }),
  };

  layers[mapStyle].addTo(_map);

  // Layer switcher
  container.querySelector('.map-layer-control')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.map-layer-btn');
    if (!btn) return;
    const style = btn.dataset.style;
    container.querySelectorAll('.map-layer-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    Object.values(layers).forEach(l => _map.removeLayer(l));
    layers[style].addTo(_map);
    import('../db.js').then(m => m.setSetting('mapStyle', style));
  });

  // Load observations and add markers
  await loadMarkers();
}

async function loadMarkers() {
  if (!_map) return;

  const observations = await db.observations
    .filter(obs => obs.lat != null && obs.lng != null)
    .toArray();

  if (typeof L.markerClusterGroup === 'function') {
    _clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    });
  }

  const markerTarget = _clusterGroup || _map;

  for (const obs of observations) {
    const marker = L.marker([obs.lat, obs.lng]);

    marker.bindPopup(`
      <div class="popup-content">
        <div class="popup-species">${obs.speciesName || 'Unbestimmt'}</div>
        <div class="popup-meta">${obs.date || ''} ${obs.time ? '· ' + obs.time : ''}</div>
        ${obs.evidenceType ? `<div class="popup-meta">${obs.evidenceType}</div>` : ''}
        <a class="popup-link" href="#view/${obs.id}">Details →</a>
      </div>
    `);

    if (_clusterGroup) {
      _clusterGroup.addLayer(marker);
    } else {
      marker.addTo(_map);
    }
  }

  if (_clusterGroup) {
    _map.addLayer(_clusterGroup);
  }

  // Fit bounds if we have observations
  if (observations.length > 0) {
    const bounds = L.latLngBounds(observations.map(o => [o.lat, o.lng]));
    _map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  }
}

function destroy() {
  if (_map) {
    _map.remove();
    _map = null;
  }
  _clusterGroup = null;
  _container = null;
}

export default { init, destroy };

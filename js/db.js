/* ==========================================================================
   AraLog – Database (db.js)
   Dexie.js setup, schema definition, migrations
   ========================================================================== */

// Dexie is loaded globally via <script> tag in index.html
const Dexie = window.Dexie;

const db = new Dexie('AraLogDB');

// Schema Version 1 – MVP
// Index notation:
//   ++id    = auto-increment primary key
//   field   = indexed field
//   [a+b]   = compound index
//   *array  = multi-entry index (each array element indexed)
db.version(1).stores({
  // ── Beobachtungen (Haupttabelle) ──
  // Indexed: date (Sortierung), speciesId (Filterung), lat+lng (Karte), tags (Multi-Entry)
  observations: '++id, date, speciesId, speciesName, [lat+lng], *tags, createdAt',

  // ── Fotos (separat wegen Blob-Größe) ──
  // Indexed: observationId (Verknüpfung), type (Filterung nach Foto-Typ)
  photos: '++id, observationId, type',

  // ── Standorte (Phase 2, Schema schon angelegt) ──
  locations: '++id, name, [lat+lng]',

  // ── Benutzerdefinierte Arten (Ergänzungen zur Stammliste) ──
  customSpecies: '++id, scientificName, germanName, family',

  // ── App-Einstellungen ──
  settings: 'key'
});

// ── Default-Einstellungen initialisieren ──
async function initDefaults() {
  const existing = await db.settings.get('initialized');
  if (!existing) {
    await db.settings.bulkPut([
      { key: 'initialized', value: true },
      { key: 'version', value: '1.0.0' },
      { key: 'mapStyle', value: 'standard' },    // 'standard' | 'topo'
      { key: 'defaultMapCenter', value: { lat: 52.52, lng: 13.40 } },  // Berlin
      { key: 'defaultMapZoom', value: 11 },
    ]);
  }
}

// ── Helper: Einstellung lesen ──
async function getSetting(key, fallback = null) {
  const entry = await db.settings.get(key);
  return entry ? entry.value : fallback;
}

// ── Helper: Einstellung schreiben ──
async function setSetting(key, value) {
  return db.settings.put({ key, value });
}

// ── Neue Beobachtung (Template) ──
function createObservationTemplate() {
  const now = new Date();
  return {
    // Zeitpunkt
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),

    // Artbestimmung
    speciesId: null,
    speciesName: '',
    scientificName: '',
    confidence: 'unsicher',

    // Standort
    lat: null,
    lng: null,
    locationName: '',
    locationId: null,

    // Fund-Klassifikation
    evidenceType: 'Spinne',
    lifeStage: 'Adult',
    sex: 'Unbekannt',

    // Verhalten & Position
    behaviorTags: [],
    position: '',
    positionFreetext: '',
    spiderVisible: true,
    approachReaction: '',

    // Interaktionen
    interactionTags: [],

    // Netz/Gespinst
    webType: '',
    webCondition: '',
    cocoonCondition: '',

    // Habitat
    habitatTags: [],
    plant: '',
    heightAboveGround: '',

    // Umgebung
    temperature: null,
    weatherTags: [],

    // Meta
    notes: '',
    tags: [],
    photoIds: [],
  };
}

// ── Storage-Nutzung abfragen ──
async function getStorageEstimate() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      usagePercent: estimate.quota ? Math.round((estimate.usage / estimate.quota) * 100) : 0,
    };
  }
  return { usage: 0, quota: 0, usagePercent: 0 };
}

// ── Counts für Dashboard/Status ──
async function getCounts() {
  const [observations, photos, customSpecies] = await Promise.all([
    db.observations.count(),
    db.photos.count(),
    db.customSpecies.count(),
  ]);
  return { observations, photos, customSpecies };
}

export default db;
export {
  initDefaults,
  getSetting,
  setSetting,
  createObservationTemplate,
  getStorageEstimate,
  getCounts,
};

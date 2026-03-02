/* ==========================================================================
   AraLog – Wertelisten / Enums (enums.js)
   Alle vordefinierten Auswahllisten für Formularfelder
   ========================================================================== */

// ── Bestimmungssicherheit ──
export const CONFIDENCE = ['sicher', 'wahrscheinlich', 'unsicher'];

// ── Fund-Klassifikation ──
export const EVIDENCE_TYPE = ['Spinne', 'Kokon', 'Brutgespinst', 'Exuvie', 'Nur Netz'];
export const LIFE_STAGE = ['Adult', 'Subadult', 'Juvenil'];
export const SEX = ['Weiblich', 'Männlich', 'Unbekannt'];

// ── Position (Enum + Freitext) ──
export const POSITION = [
  'Freilaufend',
  'Am Netz',
  'Im Netz',
  'Im Gespinst',
  'In Röhre/Spalt',
  'Unter Stein',
  'Unter Rinde',
  'An Blüte',
  'An Fassade/Mauer',
  'Am Boden/Laubstreu',
  'Auf Vegetation',
];

// ── Reaktion auf Annäherung ──
export const APPROACH_REACTION = [
  'Bleibt',
  'Erstarrt',
  'Versteckt sich',
  'Flieht',
  'Droht',
  'Abseilen',
  'Springt',
];

// ── Verhalten (Tags, Multiselect) ──
export const BEHAVIOR_TAGS = [
  'Netzbau',
  'Netzaktiv',
  'Jagend',
  'Beutehandling',
  'Ruhend',
  'Versteckt',
  'Flucht',
  'Drohverhalten',
  'Balz',
  'Paarung',
  'Brutpflege',
  'Kokon tragend',
  'Jungtiere tragend',
  'Häutung vorbereitend',
  'Häutung aktiv',
  'Sonnenbaden',
];

// ── Interaktionen (Tags, Multiselect) ──
export const INTERACTION_TAGS = [
  'Beute',
  'Beuterest',
  'Partner',
  'Rivale',
  'Prädator',
  'Parasitoid',
  'Kleptoparasit',
  'Andere Spinne',
  'Kolonie/Aggregation',
  'Mensch',
  'Tier',
];

// ── Netztyp ──
export const WEB_TYPE = [
  'Radnetz',
  'Trichternetz',
  'Haubennetz',
  'Deckennetz',
  'Gespinst',
  'Baldachin',
  'Kugelnetz',
  'Wirrnetz',
  'kein Netz',
];

// ── Zustand Netz/Gespinst ──
export const WEB_CONDITION = [
  'Gut sichtbar',
  'Morgentau sichtbar',
  'Stark getarnt',
  'Beschädigt',
  'Intakt',
  'Verlassen',
  'Kein Netz',
];

// ── Zustand Kokon ──
export const COCOON_CONDITION = [
  'Intakt',
  'Zerstört',
  'Schlupfspuren sichtbar',
  'Geöffnet',
  'Kein Kokon',
];

// ── Habitat (Tags, Multiselect, gruppiert) ──
export const HABITAT_GROUPS = [
  {
    label: 'Offenland',
    tags: ['Wiese', 'Trockenrasen', 'Brache/Ruderalfläche', 'Feldrand', 'Streuobstwiese', 'Sand'],
  },
  {
    label: 'Saum/Struktur',
    tags: ['Wegesrand/Trampelpfad', 'Hecke/Gebüsch', 'Waldrand', 'Lichtung', 'Garten/Park', 'Balkon/Terrasse'],
  },
  {
    label: 'Wald/Laub',
    tags: ['Wald', 'Laubstreu', 'Totholz/Holzstapel', 'Rinde/Borke', 'Unter Stein'],
  },
  {
    label: 'Gebäude',
    tags: ['Gebäude innen', 'Gebäude außen/Fassade', 'Keller/Garage/Schuppen', 'Mauer/Zaun', 'Fensterrahmen/Rollladenkasten'],
  },
  {
    label: 'Feucht',
    tags: ['Ufer', 'Graben', 'Moor/Sumpf', 'Feuchtwiese'],
  },
];

// Flache Liste aller Habitat-Tags (für Suche/Filter)
export const HABITAT_TAGS_FLAT = HABITAT_GROUPS.flatMap(g => g.tags);

// ── Wetter (Tags, Multiselect, gruppiert) ──
export const WEATHER_GROUPS = [
  {
    label: 'Himmel/Licht',
    tags: ['Sonnig', 'Heiter', 'Leicht bewölkt', 'Bewölkt', 'Bedeckt', 'Nebelig', 'Dunstig', 'Dämmerung', 'Nacht'],
  },
  {
    label: 'Niederschlag',
    tags: ['Trocken', 'Nieselregen', 'Regen', 'Starkregen', 'Nach Regen', 'Tau', 'Reif', 'Schnee'],
  },
  {
    label: 'Temperatur-Eindruck',
    tags: ['Bodenfrost', 'Sehr kalt', 'Kalt', 'Kühl', 'Mild', 'Warm', 'Heiß'],
  },
  {
    label: 'Feuchtigkeit',
    tags: ['Trockene Luft', 'Feucht', 'Hohe Luftfeuchte', 'Nach Tau', 'Nach Regen feucht', 'Befeuchteter Boden'],
  },
];

// ── Foto-Typ ──
export const PHOTO_TYPE = ['Spinne', 'Kokon', 'Netz', 'Habitat', 'Detail'];

// ── Quick-Tags (frei definierbar, Vorschlagsliste) ──
export const QUICK_TAGS = [
  'Erstfund',
  'Wiederfund',
  'Bestimmung offen',
  'Bestimmt durch Experten',
  'Meldeplattform AraGes',
  'Meldeplattform iNaturalist',
  'Verwechslungsgefahr',
  'Bissfrage',
  'Netztyp unbekannt',
];

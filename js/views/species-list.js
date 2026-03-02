/* ==========================================================================
   AraLog – Species List View
   Browse and search the species catalog
   ========================================================================== */

// Placeholder – will import from data/species-catalog.js once populated
const PLACEHOLDER_SPECIES = [
  { id: 'cheiracanthium_punctorium', germanName: 'Ammen-Dornfinger', scientificName: 'Cheiracanthium punctorium', family: 'Cheiracanthiidae', distribution: 'mäßig verbreitet' },
  { id: 'araneus_diadematus', germanName: 'Gartenkreuzspinne', scientificName: 'Araneus diadematus', family: 'Araneidae', distribution: 'häufig' },
  { id: 'argiope_bruennichi', germanName: 'Wespenspinne', scientificName: 'Argiope bruennichi', family: 'Araneidae', distribution: 'häufig' },
  { id: 'pisaura_mirabilis', germanName: 'Listspinne', scientificName: 'Pisaura mirabilis', family: 'Pisauridae', distribution: 'häufig' },
  { id: 'salticus_scenicus', germanName: 'Zebraspringspinne', scientificName: 'Salticus scenicus', family: 'Salticidae', distribution: 'häufig' },
];

let _container = null;

async function init(container, params) {
  _container = container;

  container.innerHTML = `
    <div class="view-container">
      <h2>Artenliste</h2>
      <p class="text-muted" style="margin-bottom: var(--space-lg);">
        Kuratierte Artenliste für Berlin/Brandenburg (Platzhalter – wird erweitert)
      </p>

      <div class="search-bar" style="margin-bottom: var(--space-lg);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input type="text" class="form-input" id="species-search"
               placeholder="Art suchen..." autocomplete="off">
      </div>

      <div id="species-list">
        ${PLACEHOLDER_SPECIES.map(renderSpecies).join('')}
      </div>
    </div>
  `;

  container.querySelector('#species-search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const list = container.querySelector('#species-list');
    if (!list) return;

    const filtered = query
      ? PLACEHOLDER_SPECIES.filter(s =>
          s.germanName.toLowerCase().includes(query) ||
          s.scientificName.toLowerCase().includes(query) ||
          s.family.toLowerCase().includes(query))
      : PLACEHOLDER_SPECIES;

    list.innerHTML = filtered.length
      ? filtered.map(renderSpecies).join('')
      : '<div class="empty-state"><h3>Keine Arten gefunden</h3></div>';
  });
}

function renderSpecies(species) {
  const distColor = species.distribution === 'häufig' ? 'badge-sicher'
    : species.distribution === 'mäßig verbreitet' ? 'badge-wahrscheinlich'
    : 'badge-unsicher';

  return `
    <div class="species-card">
      <div class="species-german">${species.germanName}</div>
      <div class="sci-name">${species.scientificName}</div>
      <div class="species-family">${species.family}</div>
      <span class="badge ${distColor} species-distribution">${species.distribution}</span>
    </div>
  `;
}

function destroy() {
  _container = null;
}

export default { init, destroy };

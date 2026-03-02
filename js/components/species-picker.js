/* ==========================================================================
   AraLog – Species Picker Component
   Autocomplete search for species selection from catalog + custom species
   ========================================================================== */

import { searchSpecies, getSpeciesById, speciesCatalog } from '../data/species-catalog.js';
import db from '../db.js';

/**
 * Creates a species picker with autocomplete.
 *
 * @param {HTMLElement} container - Element to render into
 * @param {Object} options
 * @param {string} options.value - Initial species name
 * @param {string} options.speciesId - Initial species ID
 * @param {Function} options.onChange - Callback({speciesId, speciesName, scientificName, distribution})
 * @returns {Object} - { destroy() }
 */
export function createSpeciesPicker(container, options = {}) {
  const { value = '', speciesId = null, onChange = () => {} } = options;

  let selectedSpecies = speciesId ? getSpeciesById(speciesId) : null;
  let highlightIndex = -1;
  let results = [];

  // ── Render ──
  container.innerHTML = `
    <div class="species-picker-wrapper">
      <input type="text" class="form-input species-input"
             placeholder="Art suchen (deutsch oder wissenschaftlich)..."
             value="${escapeHtml(value)}"
             autocomplete="off"
             autocorrect="off"
             autocapitalize="off"
             spellcheck="false">
      <div class="species-dropdown"></div>
      ${selectedSpecies ? renderSelected(selectedSpecies) : ''}
    </div>
  `;

  const input = container.querySelector('.species-input');
  const dropdown = container.querySelector('.species-dropdown');
  let debounceTimer = null;

  // ── Event Handlers ──

  function onInput(e) {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();

    if (query.length < 2) {
      closeDropdown();
      return;
    }

    // Debounce: 150ms
    debounceTimer = setTimeout(async () => {
      results = await search(query);
      highlightIndex = -1;

      if (results.length === 0) {
        dropdown.innerHTML = `
          <div class="species-option species-freetext" data-action="freetext">
            <span class="german-name">„${escapeHtml(query)}" als Freitext verwenden</span>
            <span class="sci-name">Unbestimmte oder nicht gelistete Art</span>
          </div>
        `;
      } else {
        dropdown.innerHTML = results.map((s, i) => `
          <div class="species-option" data-index="${i}" data-id="${s.id || ''}">
            <span class="german-name">${highlightMatch(s.germanName, query)}</span>
            <span class="sci-name">${highlightMatch(s.scientificName, query)}</span>
            <span class="family">${s.family} · ${s.distribution || ''}</span>
          </div>
        `).join('') + `
          <div class="species-option species-freetext" data-action="freetext">
            <span class="german-name">„${escapeHtml(query)}" als Freitext verwenden</span>
          </div>
        `;
      }

      dropdown.classList.add('open');
    }, 150);
  }

  function onKeydown(e) {
    if (!dropdown.classList.contains('open')) return;

    const optionCount = dropdown.querySelectorAll('.species-option').length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        highlightIndex = Math.min(highlightIndex + 1, optionCount - 1);
        updateHighlight();
        break;

      case 'ArrowUp':
        e.preventDefault();
        highlightIndex = Math.max(highlightIndex - 1, 0);
        updateHighlight();
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0) {
          const highlighted = dropdown.querySelector('.species-option.highlighted');
          if (highlighted) selectOption(highlighted);
        } else if (results.length > 0) {
          selectOption(dropdown.querySelector('.species-option'));
        } else {
          selectFreetext(input.value.trim());
        }
        break;

      case 'Escape':
        closeDropdown();
        input.blur();
        break;
    }
  }

  function onDropdownClick(e) {
    const option = e.target.closest('.species-option');
    if (option) selectOption(option);
  }

  function onBlur() {
    // Delay to allow click on dropdown
    setTimeout(() => closeDropdown(), 200);
  }

  function onFocus() {
    if (input.value.trim().length >= 2) {
      onInput({ target: input });
    }
  }

  // ── Selection ──

  function selectOption(optionEl) {
    if (optionEl.dataset.action === 'freetext') {
      selectFreetext(input.value.trim());
      return;
    }

    const index = parseInt(optionEl.dataset.index);
    const species = results[index];
    if (!species) return;

    selectedSpecies = species;
    input.value = species.germanName;

    // Show selected info
    const existing = container.querySelector('.species-selected');
    if (existing) existing.remove();
    input.insertAdjacentHTML('afterend', renderSelected(species));

    closeDropdown();
    onChange({
      speciesId: species.id || null,
      speciesName: species.germanName,
      scientificName: species.scientificName,
      distribution: species.distribution || '',
    });
  }

  function selectFreetext(name) {
    if (!name) return;

    selectedSpecies = null;
    input.value = name;

    const existing = container.querySelector('.species-selected');
    if (existing) existing.remove();

    closeDropdown();
    onChange({
      speciesId: null,
      speciesName: name,
      scientificName: '',
      distribution: '',
    });
  }

  // ── Helpers ──

  async function search(query) {
    // Search catalog
    const catalogResults = searchSpecies(query, 8);

    // Search custom species
    const q = query.toLowerCase();
    const customResults = await db.customSpecies
      .filter(s =>
        s.germanName?.toLowerCase().includes(q) ||
        s.scientificName?.toLowerCase().includes(q)
      )
      .limit(5)
      .toArray();

    // Merge, catalog first, then custom (marked)
    const custom = customResults.map(s => ({
      ...s,
      id: `custom_${s.id}`,
      distribution: 'eigene Art',
    }));

    return [...catalogResults, ...custom];
  }

  function closeDropdown() {
    dropdown.classList.remove('open');
    dropdown.innerHTML = '';
    results = [];
    highlightIndex = -1;
  }

  function updateHighlight() {
    dropdown.querySelectorAll('.species-option').forEach((el, i) => {
      el.classList.toggle('highlighted', i === highlightIndex);
    });

    // Scroll into view
    const highlighted = dropdown.querySelector('.highlighted');
    if (highlighted) {
      highlighted.scrollIntoView({ block: 'nearest' });
    }
  }

  // ── Bind Events ──
  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeydown);
  input.addEventListener('blur', onBlur);
  input.addEventListener('focus', onFocus);
  dropdown.addEventListener('click', onDropdownClick);

  return {
    getValue() {
      return {
        speciesId: selectedSpecies?.id || null,
        speciesName: input.value.trim(),
        scientificName: selectedSpecies?.scientificName || '',
      };
    },
    setValue(name, id = null) {
      input.value = name;
      selectedSpecies = id ? getSpeciesById(id) : null;
    },
    destroy() {
      clearTimeout(debounceTimer);
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onKeydown);
      input.removeEventListener('blur', onBlur);
      input.removeEventListener('focus', onFocus);
      dropdown.removeEventListener('click', onDropdownClick);
    },
  };
}

// ── Render Helpers ──

function renderSelected(species) {
  return `
    <div class="species-selected" style="
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
      padding: 6px 10px;
      background: var(--accent-bg);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
    ">
      <span class="sci-name" style="flex:1;">${species.scientificName}</span>
      <span class="badge badge-${
        species.distribution === 'häufig' ? 'sicher' :
        species.distribution === 'mäßig verbreitet' ? 'wahrscheinlich' : 'unsicher'
      }">${species.distribution || ''}</span>
    </div>
  `;
}

function highlightMatch(text, query) {
  if (!query || !text) return escapeHtml(text || '');
  const escaped = escapeHtml(text);
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${q})`, 'gi');
  return escaped.replace(regex, '<mark style="background:var(--accent-bg);color:var(--accent-light);padding:0 1px;border-radius:2px;">$1</mark>');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

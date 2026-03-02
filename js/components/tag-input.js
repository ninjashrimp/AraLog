/* ==========================================================================
   AraLog – Tag Input Component
   Reusable multi-select tag picker, supports flat lists and grouped lists.
   Used for: behaviorTags, interactionTags, habitatTags, weatherTags,
             webType, webCondition, cocoonCondition, position, approachReaction, etc.
   ========================================================================== */

/**
 * Creates a tag selector (multi-select or single-select).
 *
 * @param {HTMLElement} container - Element to render into
 * @param {Object} options
 * @param {string[]} options.tags - Flat list of available tags (used if no groups)
 * @param {Array<{label:string, tags:string[]}>} options.groups - Grouped tags (overrides tags)
 * @param {string[]} options.selected - Initially selected tags
 * @param {boolean} options.multiple - Allow multiple selection (default: true)
 * @param {boolean} options.allowFreetext - Allow custom tags (default: false)
 * @param {string} options.freetextPlaceholder - Placeholder for freetext input
 * @param {Function} options.onChange - Callback(selectedTags: string[])
 * @returns {Object} - { getSelected(), setSelected(tags), destroy() }
 */
export function createTagInput(container, options = {}) {
  const {
    tags = [],
    groups = null,
    selected = [],
    multiple = true,
    allowFreetext = false,
    freetextPlaceholder = 'Eigenen Tag hinzufügen...',
    onChange = () => {},
  } = options;

  let selectedTags = new Set(selected);

  render();

  function render() {
    const content = groups
      ? renderGrouped(groups)
      : renderFlat(tags);

    container.innerHTML = `
      <div class="tag-input-wrapper">
        ${content}
        ${allowFreetext ? `
          <div class="tag-freetext" style="margin-top: var(--space-sm);">
            <div style="display: flex; gap: var(--space-sm);">
              <input type="text" class="form-input tag-freetext-input"
                     placeholder="${freetextPlaceholder}"
                     style="flex:1; min-height: 36px; font-size: var(--text-sm);">
              <button type="button" class="btn btn-secondary btn-sm tag-freetext-add">+</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Bind click handlers on tags
    container.querySelectorAll('.tag[data-tag]').forEach(el => {
      el.addEventListener('click', () => toggleTag(el.dataset.tag));
    });

    // Freetext handler
    if (allowFreetext) {
      const input = container.querySelector('.tag-freetext-input');
      const addBtn = container.querySelector('.tag-freetext-add');

      const addFreetext = () => {
        const val = input.value.trim();
        if (val && !selectedTags.has(val)) {
          selectedTags.add(val);
          input.value = '';
          updateTagStates();
          onChange([...selectedTags]);
        }
      };

      addBtn?.addEventListener('click', addFreetext);
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addFreetext();
        }
      });
    }
  }

  function renderFlat(tagList) {
    return `
      <div class="tag-container">
        ${tagList.map(tag => renderTag(tag)).join('')}
      </div>
    `;
  }

  function renderGrouped(groupList) {
    return groupList.map(group => `
      <div class="tag-group">
        <span class="tag-group-label">${group.label}</span>
        <div class="tag-container">
          ${group.tags.map(tag => renderTag(tag)).join('')}
        </div>
      </div>
    `).join('');
  }

  function renderTag(tag) {
    const isSelected = selectedTags.has(tag);
    return `<span class="tag ${isSelected ? 'selected' : ''}" data-tag="${escapeAttr(tag)}">${escapeHtml(tag)}</span>`;
  }

  function toggleTag(tag) {
    if (multiple) {
      // Multi-select: toggle
      if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
      } else {
        selectedTags.add(tag);
      }
    } else {
      // Single-select: select or deselect
      if (selectedTags.has(tag)) {
        selectedTags.clear();
      } else {
        selectedTags.clear();
        selectedTags.add(tag);
      }
    }

    updateTagStates();
    onChange([...selectedTags]);
  }

  function updateTagStates() {
    container.querySelectorAll('.tag[data-tag]').forEach(el => {
      const isSelected = selectedTags.has(el.dataset.tag);
      el.classList.toggle('selected', isSelected);
    });
  }

  return {
    getSelected() {
      return [...selectedTags];
    },
    setSelected(tags) {
      selectedTags = new Set(tags);
      updateTagStates();
    },
    destroy() {
      container.innerHTML = '';
    },
  };
}

/**
 * Creates a simple toggle group (single-select, styled as toggle buttons).
 * Used for: confidence, evidenceType, lifeStage, sex
 *
 * @param {HTMLElement} container
 * @param {Object} options
 * @param {string[]} options.values - Available values
 * @param {string} options.selected - Initially selected value
 * @param {Object} options.colorMap - Optional {value: 'css-class'} for colored toggles
 * @param {Function} options.onChange - Callback(selectedValue: string)
 * @returns {Object} - { getValue(), setValue(val), destroy() }
 */
export function createToggleGroup(container, options = {}) {
  const {
    values = [],
    selected = '',
    colorMap = {},
    onChange = () => {},
  } = options;

  let currentValue = selected;

  container.innerHTML = `
    <div class="toggle-group">
      ${values.map(v => `
        <div class="toggle-option ${v === currentValue ? 'selected' : ''}"
             data-value="${escapeAttr(v)}"
             ${colorMap[v] ? `style="--toggle-color: var(${colorMap[v]})"` : ''}>
          ${escapeHtml(v)}
        </div>
      `).join('')}
    </div>
  `;

  const group = container.querySelector('.toggle-group');

  function handleClick(e) {
    const option = e.target.closest('.toggle-option');
    if (!option) return;

    const value = option.dataset.value;

    group.querySelectorAll('.toggle-option').forEach(o => o.classList.remove('selected'));
    option.classList.add('selected');

    currentValue = value;
    onChange(value);
  }

  group.addEventListener('click', handleClick);

  return {
    getValue() {
      return currentValue;
    },
    setValue(val) {
      currentValue = val;
      group.querySelectorAll('.toggle-option').forEach(o => {
        o.classList.toggle('selected', o.dataset.value === val);
      });
    },
    setDisabled(disabled) {
      container.classList.toggle('field-disabled', disabled);
    },
    destroy() {
      group.removeEventListener('click', handleClick);
    },
  };
}

// ── Helpers ──

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

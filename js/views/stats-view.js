/* ==========================================================================
   AraLog – Statistics View
   Overview: species count, timeline, rankings, distributions
   ========================================================================== */

import db from '../db.js';

let _container = null;

async function init(container) {
  _container = container;

  const observations = await db.observations.orderBy('date').reverse().toArray();

  if (!observations.length) {
    container.innerHTML = `
      <div class="view-container">
        <div class="empty-state">
          <h3>Noch keine Statistiken</h3>
          <p class="text-muted">Erfasse Beobachtungen, um Statistiken zu sehen.</p>
        </div>
      </div>`;
    return;
  }

  const stats = computeStats(observations);

  container.innerHTML = `
    <div class="view-container">

      <!-- ── Übersicht ── -->
      <div class="stats-cards">
        <div class="stats-card">
          <div class="stats-card-value">${stats.totalObs}</div>
          <div class="stats-card-label">Beobachtungen</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-value">${stats.uniqueSpecies}</div>
          <div class="stats-card-label">Arten</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-value">${stats.uniqueFamilies}</div>
          <div class="stats-card-label">Familien</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-value">${stats.withPhotos}</div>
          <div class="stats-card-label">mit Foto</div>
        </div>
      </div>

      <!-- ── Top-Arten ── -->
      <div class="stats-section">
        <h3>Häufigste Arten</h3>
        ${renderHorizontalBars(stats.topSpecies, stats.totalObs)}
      </div>

      <!-- ── Beobachtungen pro Jahr ── -->
      ${stats.yearCounts.length > 1 ? `
        <div class="stats-section">
          <h3>Pro Jahr</h3>
          ${renderHorizontalBars(stats.yearCounts, stats.totalObs)}
        </div>
      ` : ''}

      <!-- ── Beobachtungen pro Monat (aktuelles Jahr) ── -->
      <div class="stats-section">
        <h3>Pro Monat ${stats.currentYear}</h3>
        ${renderMonthChart(stats.monthCounts)}
      </div>

      <!-- ── Bestimmungssicherheit ── -->
      <div class="stats-section">
        <h3>Bestimmungssicherheit</h3>
        ${renderDistribution(stats.confidenceDist, {
          'sicher': 'var(--success)',
          'wahrscheinlich': 'var(--warning)',
          'unsicher': 'var(--danger)',
        })}
      </div>

      <!-- ── Fundtypen ── -->
      <div class="stats-section">
        <h3>Fundtypen</h3>
        ${renderHorizontalBars(stats.evidenceDist, stats.totalObs)}
      </div>

      <!-- ── Familien ── -->
      ${stats.familyCounts.length > 0 ? `
        <div class="stats-section">
          <h3>Familien</h3>
          ${renderHorizontalBars(stats.familyCounts.slice(0, 10), stats.totalObs)}
        </div>
      ` : ''}

    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════
// Compute Stats
// ═══════════════════════════════════════════════════════════════════

function computeStats(observations) {
  const speciesCount = new Map();
  const familyCount = new Map();
  const yearCount = new Map();
  const monthCount = new Map();
  const confidenceCount = new Map();
  const evidenceCount = new Map();
  const speciesSet = new Set();
  const familySet = new Set();
  let withPhotos = 0;

  const currentYear = new Date().getFullYear().toString();

  for (const obs of observations) {
    // Species
    if (obs.speciesName && obs.speciesName !== 'Unbestimmt') {
      speciesSet.add(obs.speciesName);
      speciesCount.set(obs.speciesName, (speciesCount.get(obs.speciesName) || 0) + 1);
    }

    // Family (from scientificName or speciesId isn't reliable, use a lookup later)
    // For now, we'll extract family from the species catalog if available
    if (obs.family) {
      familySet.add(obs.family);
      familyCount.set(obs.family, (familyCount.get(obs.family) || 0) + 1);
    }

    // Year
    if (obs.date) {
      const year = obs.date.substring(0, 4);
      yearCount.set(year, (yearCount.get(year) || 0) + 1);

      // Month (current year only)
      if (year === currentYear) {
        const month = parseInt(obs.date.substring(5, 7));
        monthCount.set(month, (monthCount.get(month) || 0) + 1);
      }
    }

    // Confidence
    if (obs.confidence) {
      confidenceCount.set(obs.confidence, (confidenceCount.get(obs.confidence) || 0) + 1);
    }

    // Evidence type
    if (obs.evidenceType) {
      evidenceCount.set(obs.evidenceType, (evidenceCount.get(obs.evidenceType) || 0) + 1);
    }

    // Photos
    if (obs.photoIds?.length) withPhotos++;
  }

  // Try to get family info from species catalog
  tryResolveFamilies(observations, familySet, familyCount);

  // Sort and format
  const topSpecies = [...speciesCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, count]) => ({ label, count }));

  const yearCounts = [...yearCount.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }));

  const confidenceDist = ['sicher', 'wahrscheinlich', 'unsicher']
    .filter(c => confidenceCount.has(c))
    .map(label => ({ label, count: confidenceCount.get(label) }));

  const evidenceDist = [...evidenceCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  const familyCounts = [...familyCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  // Month counts as array of 12
  const monthCountsArr = [];
  for (let m = 1; m <= 12; m++) {
    monthCountsArr.push(monthCount.get(m) || 0);
  }

  return {
    totalObs: observations.length,
    uniqueSpecies: speciesSet.size,
    uniqueFamilies: familySet.size,
    withPhotos,
    topSpecies,
    yearCounts,
    monthCounts: monthCountsArr,
    confidenceDist,
    evidenceDist,
    familyCounts,
    currentYear,
  };
}

function tryResolveFamilies(observations, familySet, familyCount) {
  // Build a species→family map from observations that have family data
  // or from the catalog if it was stored on the observation
  for (const obs of observations) {
    if (obs.family) continue; // already counted

    // Try to infer family from speciesId naming convention (e.g. 'pardosa_lugubris' → Lycosidae)
    // This is a best-effort approach; the catalog would be better but we don't import it here
    // to keep the stats view lightweight. Family data should ideally be stored on the observation.
  }
}

// ═══════════════════════════════════════════════════════════════════
// Chart Rendering (pure CSS)
// ═══════════════════════════════════════════════════════════════════

function renderHorizontalBars(items, total) {
  if (!items.length) return '<p class="text-muted">Keine Daten</p>';

  const maxCount = Math.max(...items.map(i => i.count));

  return `
    <div class="stats-bars">
      ${items.map(item => {
        const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        return `
          <div class="stats-bar-row">
            <span class="stats-bar-label">${escapeHtml(item.label)}</span>
            <div class="stats-bar-track">
              <div class="stats-bar-fill" style="width: ${pct}%"></div>
            </div>
            <span class="stats-bar-value">${item.count}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderMonthChart(monthCounts) {
  const maxCount = Math.max(...monthCounts, 1);
  const monthNames = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  return `
    <div class="stats-month-chart">
      ${monthCounts.map((count, i) => {
        const pct = (count / maxCount) * 100;
        const isActive = count > 0;
        return `
          <div class="stats-month-col">
            <div class="stats-month-bar-track">
              <div class="stats-month-bar ${isActive ? 'active' : ''}" style="height: ${pct}%"></div>
            </div>
            ${isActive ? `<span class="stats-month-value">${count}</span>` : ''}
            <span class="stats-month-label">${monthNames[i]}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderDistribution(items, colorMap = {}) {
  const total = items.reduce((sum, i) => sum + i.count, 0);
  if (!total) return '<p class="text-muted">Keine Daten</p>';

  return `
    <div class="stats-dist">
      <div class="stats-dist-bar">
        ${items.map(item => {
          const pct = (item.count / total) * 100;
          const color = colorMap[item.label] || 'var(--accent)';
          return `<div class="stats-dist-segment" style="width: ${pct}%; background: ${color}" title="${item.label}: ${item.count}"></div>`;
        }).join('')}
      </div>
      <div class="stats-dist-legend">
        ${items.map(item => {
          const pct = Math.round((item.count / total) * 100);
          const color = colorMap[item.label] || 'var(--accent)';
          return `
            <div class="stats-dist-item">
              <span class="stats-dist-dot" style="background: ${color}"></span>
              <span>${escapeHtml(item.label)}</span>
              <span class="stats-dist-count">${item.count} (${pct}%)</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function destroy() {
  _container = null;
}

export default { init, destroy };

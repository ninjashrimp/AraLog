/* ==========================================================================
   AraLog – App Entry Point (app.js)
   Initialization, router setup, global utilities
   ========================================================================== */

import db, { initDefaults } from './db.js';
import router from './router.js';

// ── App State ──
const app = {
  isOnline: navigator.onLine,
  swRegistration: null,
};

// ── Initialize App ──
async function init() {
  console.log('[AraLog] Initializing...');

  // 1. Initialize database defaults
  await initDefaults();

  // 2. Register Service Worker
  await registerServiceWorker();

  // 3. Setup router with view loaders
  const content = document.getElementById('app-content');

  router
    .on('', () => import('./views/observation-list.js'))
    .on('new', () => import('./views/observation-form.js'))
    .on('edit/:id', () => import('./views/observation-form.js'))
    .on('view/:id', () => import('./views/observation-detail.js'))
    .on('map', () => import('./views/map-view.js'))
    .on('species', () => import('./views/species-list.js'))
    .on('settings', () => import('./views/settings.js'))
    .init(content);

  // 4. Monitor online/offline status
  window.addEventListener('online', () => {
    app.isOnline = true;
    showToast('Wieder online', 'success');
  });

  window.addEventListener('offline', () => {
    app.isOnline = false;
    showToast('Offline – Daten werden lokal gespeichert', 'info');
  });

  // 5. Prevent accidental data loss
  window.addEventListener('beforeunload', (e) => {
    // Only warn if there's an unsaved form
    const unsavedForm = document.querySelector('[data-unsaved="true"]');
    if (unsavedForm) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  console.log('[AraLog] Ready.');
}

// ── Service Worker Registration ──
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[AraLog] Service Worker not supported');
    return;
  }

  try {
    const reg = await navigator.serviceWorker.register('./sw.js');
    app.swRegistration = reg;

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
          // New version available
          showUpdateBanner();
        }
      });
    });

    console.log('[AraLog] Service Worker registered');
  } catch (err) {
    console.error('[AraLog] Service Worker registration failed:', err);
  }
}

// ── Update Banner ──
function showUpdateBanner() {
  const banner = document.getElementById('update-banner');
  if (banner) {
    banner.classList.add('visible');
    banner.addEventListener('click', () => {
      window.location.reload();
    }, { once: true });
  }
}

// ── Toast System ──
let toastTimeout = null;

function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Remove existing toast
  const existing = container.querySelector('.toast');
  if (existing) {
    existing.remove();
    clearTimeout(toastTimeout);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  toastTimeout = setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

// Make toast globally available
window.AraLog = {
  showToast,
  get isOnline() { return app.isOnline; },
  navigate: (hash) => router.navigate(hash),
};

// ── Start ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { showToast };

/* ==========================================================================
   AraLog – Router (router.js)
   Hash-based SPA Router with view lifecycle management
   ========================================================================== */

class Router {
  constructor() {
    this.routes = new Map();
    this.currentView = null;
    this.currentRoute = null;
    this.container = null;
    this._onHashChange = this._handleRoute.bind(this);
  }

  // ── Setup ──

  /**
   * Initialize the router.
   * @param {HTMLElement} container - The DOM element where views are rendered
   */
  init(container) {
    this.container = container;
    window.addEventListener('hashchange', this._onHashChange);
    // Handle initial route
    this._handleRoute();
  }

  /**
   * Register a route.
   * @param {string} pattern - Route pattern, e.g. 'view/:id' or ''
   * @param {Function} viewLoader - Async function returning a view module
   */
  on(pattern, viewLoader) {
    this.routes.set(pattern, viewLoader);
    return this; // chainable
  }

  /**
   * Navigate to a route.
   * @param {string} hash - Route hash without '#', e.g. 'view/42'
   */
  navigate(hash) {
    window.location.hash = hash ? `#${hash}` : '';
  }

  /**
   * Get current route info.
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Clean up the router.
   */
  destroy() {
    window.removeEventListener('hashchange', this._onHashChange);
    this._destroyCurrentView();
  }

  // ── Internal ──

  async _handleRoute() {
    const hash = window.location.hash.slice(1); // remove '#'
    const { pattern, params } = this._matchRoute(hash);

    if (!pattern && pattern !== '') {
      // No matching route → redirect to home
      this.navigate('');
      return;
    }

    // Don't re-render same route (unless params changed)
    const routeKey = `${pattern}:${JSON.stringify(params)}`;
    if (routeKey === this.currentRoute) return;
    this.currentRoute = routeKey;

    // Destroy previous view
    this._destroyCurrentView();

    // Update nav state
    this._updateNavState(hash);

    // Load and init new view
    try {
      const viewLoader = this.routes.get(pattern);
      const viewModule = await viewLoader();
      const view = viewModule.default || viewModule;

      this.currentView = view;
      this.container.innerHTML = '';

      if (typeof view.init === 'function') {
        await view.init(this.container, params);
      }
    } catch (err) {
      console.error(`[Router] Failed to load view for "${hash}":`, err);
      this.container.innerHTML = `
        <div class="view-container">
          <div class="empty-state">
            <h3>Fehler beim Laden</h3>
            <p>${err.message}</p>
          </div>
        </div>
      `;
    }
  }

  _matchRoute(hash) {
    // Try exact match first
    if (this.routes.has(hash)) {
      return { pattern: hash, params: {} };
    }

    // Try pattern matching (e.g. 'view/:id')
    for (const [pattern] of this.routes) {
      const params = this._extractParams(pattern, hash);
      if (params !== null) {
        return { pattern, params };
      }
    }

    return { pattern: null, params: {} };
  }

  _extractParams(pattern, hash) {
    const patternParts = pattern.split('/');
    const hashParts = hash.split('/');

    if (patternParts.length !== hashParts.length) return null;

    const params = {};

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        // Dynamic segment
        const key = patternParts[i].slice(1);
        params[key] = decodeURIComponent(hashParts[i]);
      } else if (patternParts[i] !== hashParts[i]) {
        // Static segment mismatch
        return null;
      }
    }

    return params;
  }

  _destroyCurrentView() {
    if (this.currentView && typeof this.currentView.destroy === 'function') {
      try {
        this.currentView.destroy();
      } catch (err) {
        console.warn('[Router] Error destroying view:', err);
      }
    }
    this.currentView = null;
  }

  _updateNavState(hash) {
    const navItems = document.querySelectorAll('.nav-item');
    const baseRoute = hash.split('/')[0] || '';

    navItems.forEach(item => {
      const itemRoute = (item.getAttribute('href') || '').replace('#', '');
      const itemBase = itemRoute.split('/')[0] || '';

      if (itemBase === baseRoute) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
}

// Singleton instance
const router = new Router();

export default router;

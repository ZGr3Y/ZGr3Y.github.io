import './styles/main.css';
import { PortfolioApp } from './core/PortfolioApp.js';
import { PrototypeJourneyApp } from './prototype/PrototypeJourneyApp.js';

/**
 * Main Browser Bootstrap
 */
window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  const urlParams = new URLSearchParams(window.location.search);
  const isPrototype = urlParams.get('prototype') !== 'false';

  if (isPrototype) {
    const protoApp = new PrototypeJourneyApp();
    protoApp.mount(container);
    if (import.meta.env.DEV) {
      window.__PROTOTYPE_APP__ = protoApp;
    }
  } else {
    const canvas = document.getElementById('cloud-canvas');
    const srAnnouncer = document.getElementById('sr-announcements');
    const app = new PortfolioApp({ container, canvas, srAnnouncer, enableLoader: true });

    if (import.meta.env.DEV) {
      window.__PORTFOLIO_APP__ = app;
    }
  }
});

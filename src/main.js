import './styles/main.css';
import { PortfolioApp } from './core/PortfolioApp.js';

/**
 * Main Browser Bootstrap
 */
window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  const canvas = document.getElementById('cloud-canvas');
  const srAnnouncer = document.getElementById('sr-announcements');

  const app = new PortfolioApp({ container, canvas, srAnnouncer });

  // Expose on window for debugging/inspection in dev environment
  if (import.meta.env.DEV) {
    window.__PORTFOLIO_APP__ = app;
  }
});

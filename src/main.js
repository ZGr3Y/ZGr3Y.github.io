import './styles/main.css';
import { PortfolioApp } from './core/PortfolioApp.js';

/**
 * Main Browser Bootstrap
 */
function bootstrap() {
  const container = document.getElementById('app');
  const canvas = document.getElementById('cloud-canvas');
  const srAnnouncer = document.getElementById('sr-announcements');

  const app = new PortfolioApp({ container, canvas, srAnnouncer, enableLoader: true });

  // Expose on window for debugging/inspection in dev environment
  window.__PORTFOLIO_APP__ = app;
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

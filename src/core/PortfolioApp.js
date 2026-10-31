import { STATIONS } from '../stations/stationsData.js';

/**
 * PortfolioApp — Primary Application Root Seam
 * Coordinates lifecycle, station state, and external accessibility interfaces.
 */
export class PortfolioApp {
  constructor({ container, canvas, srAnnouncer } = {}) {
    this.container = container;
    this.canvas = canvas;
    this.srAnnouncer = srAnnouncer;

    this.stations = STATIONS;
    this.currentStationIndex = 0;
    this.isDestroyed = false;

    this.init();
  }

  init() {
    if (this.container) {
      this.container.setAttribute('data-active-station', this.stations[0].id);
    }
  }

  getActiveStationIndex() {
    return this.currentStationIndex;
  }

  getActiveStation() {
    return this.stations[this.currentStationIndex] || this.stations[0];
  }

  async navigateTo(stationIndex) {
    if (this.isDestroyed) return;
    if (stationIndex < 0 || stationIndex >= this.stations.length) return;
    if (this.currentStationIndex === stationIndex) return;

    this.currentStationIndex = stationIndex;
    const activeStation = this.getActiveStation();

    if (this.container) {
      this.container.setAttribute('data-active-station', activeStation.id);
    }

    if (this.srAnnouncer) {
      this.srAnnouncer.textContent = `Navigated to station ${activeStation.name}: ${activeStation.subtitle}`;
    }
  }

  destroy() {
    this.isDestroyed = true;
    if (this.container) {
      this.container.removeAttribute('data-active-station');
    }
  }
}

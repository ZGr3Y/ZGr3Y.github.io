import { SceneManager } from './core/SceneManager.js';
import { AudioManager } from './core/AudioManager.js';
import { HUD } from './ui/HUD.js';
import { StationDOMOverlay } from './ui/StationDOMOverlay.js';
import { ProjectModal } from './ui/ProjectModal.js';
import { PrototypeSwitcher } from './ui/PrototypeSwitcher.js';

import './styles/main.css';
import './styles/glass.css';
import './styles/hud.css';
import './styles/switcher.css';

/**
 * Application Bootstrap
 * Paolo Maria Scarlata (ZGr3Y) Spatial 3D Security Portfolio
 */
function initApp() {
  // 1. Resolve initial visual variant from URL query param (?variant=A or ?variant=B)
  const urlParams = new URLSearchParams(window.location.search);
  const initialVariant = (urlParams.get('variant') || 'A').toUpperCase() === 'B' ? 'B' : 'A';

  // 2. Initialize Procedural Audio Synthesizer
  const audioManager = new AudioManager();

  // 3. Cache DOM Element Containers
  const canvas = document.getElementById('webgl-canvas');
  const hudContainer = document.getElementById('hud');
  const dockContainer = document.getElementById('station-dock');
  const stationOverlayContainer = document.getElementById('station-overlay');
  const modalContainer = document.getElementById('modal-container');
  const switcherContainer = document.getElementById('prototype-switcher');
  const bootLoader = document.getElementById('boot-loader');

  // 4. Declare sceneManager reference
  let sceneManager = null;

  // 5. Initialize Project Inspector Modal
  const projectModal = new ProjectModal({
    container: modalContainer,
    onOpen: (proj) => {
      audioManager.playChirp(750, 0.08);
    },
    onClose: () => {
      audioManager.playChirp(450, 0.06);
    }
  });

  // 6. Initialize Station HTML Overlays (Holographic cards, 3D tilt, asymmetric cockpit)
  const stationOverlay = new StationDOMOverlay({
    container: stationOverlayContainer,
    variant: initialVariant,
    onStationJump: (targetIdx) => {
      if (sceneManager) sceneManager.cameraController.goToStation(targetIdx);
    },
    onProjectInspect: (project) => {
      projectModal.open(project);
    },
    onAudioHover: () => {
      audioManager.playGlassHover();
    },
    onSculptureControl: ({ type, value }) => {
      if (!sceneManager) return;
      if (type === 'speed') sceneManager.setSculptureSpeed(value);
      if (type === 'mode') sceneManager.setSculptureWireframeMode(value);
      audioManager.playChirp(1100, 0.05);
    }
  });

  // 7. Initialize Persistent HUD & Dock
  const hud = new HUD({
    container: hudContainer,
    dockContainer: dockContainer,
    onStationSelect: (idx) => {
      if (sceneManager) sceneManager.cameraController.goToStation(idx);
    },
    onAudioToggle: () => {
      return audioManager.toggleMute();
    }
  });

  // 8. Initialize Three.js 3D Scene Manager
  sceneManager = new SceneManager({
    canvas,
    initialVariant,
    onStationChange: (index, station) => {
      hud.setStation(index);
      stationOverlay.setStation(index);
      audioManager.playStationGlide();
    },
    onCoordinatesUpdate: (camPos, target) => {
      hud.updateCoordinates(camPos);
    },
    onIdleStateChange: (isIdle) => {
      hud.setIdleState(isIdle);
    }
  });

  // 9. Initialize Floating Prototype Switcher
  const switcher = new PrototypeSwitcher({
    container: switcherContainer,
    activeVariant: initialVariant,
    onVariantChange: (newVariant) => {
      sceneManager.setVariant(newVariant);
      stationOverlay.setVariant(newVariant);
      audioManager.playChirp(920, 0.1);
    }
  });

  // 9. Dismiss Boot Loader with fade transition
  setTimeout(() => {
    if (bootLoader) {
      bootLoader.classList.add('fade-out');
      setTimeout(() => {
        bootLoader.remove();
      }, 900);
    }
    document.body.classList.remove('loading');
  }, 450);
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

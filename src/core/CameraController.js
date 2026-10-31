import * as THREE from 'three';

/**
 * Cinematic 3D Camera Controller with Station Waypoints & Parallax Damping
 */
export class CameraController {
  constructor({
    camera,
    stations,
    onStationChange = () => {},
    onCoordinatesUpdate = () => {},
    onMoveStateChange = () => {}
  }) {
    this.camera = camera;
    this.stations = stations;
    this.onStationChange = onStationChange;
    this.onCoordinatesUpdate = onCoordinatesUpdate;
    this.onMoveStateChange = onMoveStateChange;

    this.currentIndex = 0;
    this.isMoving = false;

    // Current interpolated vectors
    this.currentPosition = new THREE.Vector3().copy(this.stations[0].camera.position);
    this.currentTarget = new THREE.Vector3().copy(this.stations[0].camera.target);

    // Desired destination vectors
    this.destPosition = new THREE.Vector3().copy(this.currentPosition);
    this.destTarget = new THREE.Vector3().copy(this.currentTarget);

    // Mouse Parallax Vectors
    this.mouse = { x: 0, y: 0 };
    this.mouseDamped = { x: 0, y: 0 };

    this.wheelAccumulator = 0;
    this.wheelTimeout = null;
    this.touchStartY = 0;
    this.isLocked = false; // brief lock during transition initiation

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);

    this.initInputListeners();
  }

  initInputListeners() {
    // Mouse Parallax
    window.addEventListener('pointermove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }, { passive: true });

    // Wheel Station Navigation (throttled and boundary-aware)
    window.addEventListener('wheel', (e) => {
      // Don't hijack if user is scrolling inside an active modal
      if (e.target.closest('.modal-card')) {
        return;
      }

      // Check if target is inside an element that is actively scrollable
      const scrollable = e.target.closest('.station-section');
      if (scrollable && scrollable.scrollHeight > scrollable.clientHeight + 4) {
        const isAtBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 4;
        const isAtTop = scrollable.scrollTop <= 4;
        // If user is scrolling down inside content and not at bottom, or up and not at top, allow standard scroll
        if ((e.deltaY > 0 && !isAtBottom) || (e.deltaY < 0 && !isAtTop)) {
          return;
        }
      }

      this.wheelAccumulator += e.deltaY;
      clearTimeout(this.wheelTimeout);
      this.wheelTimeout = setTimeout(() => {
        this.wheelAccumulator = 0;
      }, 250);

      if (Math.abs(this.wheelAccumulator) > 55 && !this.isLocked) {
        if (this.wheelAccumulator > 0) {
          this.nextStation();
        } else {
          this.prevStation();
        }
        this.wheelAccumulator = 0;
      }
    }, { passive: true });

    // Touch Swipe Navigation
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (e.target.closest('.modal-card')) {
        return;
      }

      const scrollable = e.target.closest('.station-section');
      if (e.changedTouches.length > 0) {
        const deltaY = this.touchStartY - e.changedTouches[0].clientY;

        if (scrollable && scrollable.scrollHeight > scrollable.clientHeight + 4) {
          const isAtBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 4;
          const isAtTop = scrollable.scrollTop <= 4;
          if ((deltaY > 0 && !isAtBottom) || (deltaY < 0 && !isAtTop)) {
            return;
          }
        }

        if (Math.abs(deltaY) > 50 && !this.isLocked) {
          if (deltaY > 0) {
            this.nextStation();
          } else {
            this.prevStation();
          }
        }
      }
    }, { passive: true });

    // Keyboard Navigation
    window.addEventListener('keydown', (e) => {
      // Avoid intercepting if an input element is focused
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          this.nextStation();
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          this.prevStation();
          break;
        case '1':
          this.goToStation(0);
          break;
        case '2':
          this.goToStation(1);
          break;
        case '3':
          this.goToStation(2);
          break;
        case '4':
          this.goToStation(3);
          break;
      }
    });
  }

  goToStation(index) {
    if (index < 0 || index >= this.stations.length || index === this.currentIndex) return;
    this.currentIndex = index;
    const station = this.stations[index];

    this.destPosition.copy(station.camera.position);
    this.destTarget.copy(station.camera.target);

    this.setMoving(true);
    this.onStationChange(this.currentIndex, station);

    this.isLocked = true;
    setTimeout(() => {
      this.isLocked = false;
    }, 700);
  }

  nextStation() {
    const nextIdx = (this.currentIndex + 1) % this.stations.length;
    this.goToStation(nextIdx);
  }

  prevStation() {
    const prevIdx = (this.currentIndex - 1 + this.stations.length) % this.stations.length;
    this.goToStation(prevIdx);
  }

  setMoving(moving) {
    if (this.isMoving !== moving) {
      this.isMoving = moving;
      this.onMoveStateChange(moving);
    }
  }

  update(delta) {
    // 1. Smooth mouse parallax damping
    const mouseLerp = 0.05;
    this.mouseDamped.x += (this.mouse.x - this.mouseDamped.x) * mouseLerp;
    this.mouseDamped.y += (this.mouse.y - this.mouseDamped.y) * mouseLerp;

    // 2. Camera travel lerp to destination
    const travelLerp = 0.055;
    this.currentPosition.lerp(this.destPosition, travelLerp);
    this.currentTarget.lerp(this.destTarget, travelLerp);

    // Check convergence
    const distToDest = this.currentPosition.distanceTo(this.destPosition);
    const targetDist = this.currentTarget.distanceTo(this.destTarget);

    if (distToDest > 0.01 || targetDist > 0.01) {
      this.setMoving(true);
    } else {
      this.setMoving(false);
    }

    // 3. Apply position with subtle parallax offset
    const parallaxOffsetX = this.mouseDamped.x * 0.8;
    const parallaxOffsetY = this.mouseDamped.y * 0.5;

    this.camera.position.set(
      this.currentPosition.x + parallaxOffsetX,
      this.currentPosition.y + parallaxOffsetY,
      this.currentPosition.z
    );

    const lookTarget = new THREE.Vector3(
      this.currentTarget.x + parallaxOffsetX * 0.4,
      this.currentTarget.y + parallaxOffsetY * 0.4,
      this.currentTarget.z
    );

    this.camera.lookAt(lookTarget);

    // 4. Emit coordinates telemetry
    this.onCoordinatesUpdate(this.camera.position, lookTarget);
  }
}

/**
 * JourneyState — Narrative Timeline & Branch Gating Coordinator
 * Manages continuous narrative progress [0.0 - 1.0], segment metadata,
 * and gates scroll navigation until the user selects a pill choice in Act 2.
 */
export class JourneyState {
  /**
   * @param {Object} [options]
   * @param {number} [options.gateThreshold=0.6] Progress threshold where scroll is gated
   */
  constructor({ gateThreshold = 0.6 } = {}) {
    this.progress = 0;
    this.branchState = 'unselected'; // 'unselected' | 'blue' | 'red'
    this.gateThreshold = gateThreshold;
    this.maxReachable = this.gateThreshold;

    this.progressListeners = new Set();
    this.branchListeners = new Set();

    // Narrative segments definitions
    this.segments = [
      { id: 'act0', min: 0.0, max: 0.2, tag: 'ACT 00', title: "DON'T PANIC (Loader & Gateway)" },
      { id: 'act1', min: 0.2, max: 0.35, tag: 'ACT 01', title: 'Matrix White Room (Architectural Horizon)' },
      { id: 'act2', min: 0.35, max: 0.6, tag: 'ACT 02', title: 'Pill Choice (Creation of Intelligence)' },
      { id: 'act3_blue', min: 0.6, max: 0.8, tag: 'ACT 03-A', title: 'Origami Unicorns (Experiences)' },
      { id: 'act3_red', min: 0.6, max: 0.8, tag: 'ACT 03-B', title: 'Wheatley Core (Harness)' },
      { id: 'act4', min: 0.8, max: 1.0, tag: 'ACT 04', title: "Rick's Ship & Transmission Horizon" }
    ];
  }

  /**
   * Returns current continuous progress [0.0, 1.0]
   * @returns {number}
   */
  getProgress() {
    return this.progress;
  }

  /**
   * Returns the maximum reachable progress based on branch gating
   * @returns {number}
   */
  getMaxReachable() {
    return this.maxReachable;
  }

  /**
   * Sets continuous progress, respecting gating boundaries
   * @param {number} value
   */
  setProgress(value) {
    const clamped = Math.max(0, Math.min(value, this.maxReachable));
    if (this.progress !== clamped) {
      this.progress = clamped;
      this.progressListeners.forEach((fn) => fn(this.progress));
    }
  }

  /**
   * Returns whether progress is currently blocked by an unselected branch gate
   * @returns {boolean}
   */
  isGated() {
    return this.branchState === 'unselected' && this.progress >= this.gateThreshold;
  }

  /**
   * Returns current branch state ('unselected' | 'blue' | 'red')
   * @returns {string}
   */
  getBranch() {
    return this.branchState;
  }

  /**
   * Selects a narrative branch ('blue'/'experiences' or 'red'/'harness'), unlocking the rest of the journey
   * @param {'blue' | 'red' | 'experiences' | 'harness'} branch
   */
  selectBranch(branch) {
    let normalized = branch;
    if (branch === 'experiences') normalized = 'blue';
    if (branch === 'harness') normalized = 'red';
    if (normalized !== 'blue' && normalized !== 'red') return;
    if (this.branchState === normalized) return;
    this.branchState = normalized;
    this.maxReachable = 1.0;
    this.branchListeners.forEach((fn) => fn(this.branchState));
  }

  /**
   * Resets branch selection to unselected and re-arms the progression gate
   */
  resetBranch() {
    this.branchState = 'unselected';
    this.maxReachable = this.gateThreshold;
    this.branchListeners.forEach((fn) => fn(this.branchState));
  }

  /**
   * Returns metadata for the active narrative segment
   * @returns {{ id: string, tag: string, title: string, min: number, max: number }}
   */
  getCurrentSegment() {
    const p = this.progress;

    // Gated boundary at gateThreshold (0.6): Act 2 remains active while waiting at the gate
    if (this.branchState === 'unselected' && p >= this.gateThreshold) {
      return this.segments[2]; // Act 02 Pill Choice
    }

    for (const seg of this.segments) {
      if (p >= seg.min && (p < seg.max || (seg.max === 1.0 && p <= 1.0))) {
        if (seg.id === 'act3_blue' && this.branchState === 'red') {
          return this.segments[4]; // Act 03-B Wheatley Core
        }
        return seg;
      }
    }

    return this.segments[0];
  }

  /**
   * Registers a callback for progress updates
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  onProgress(callback) {
    this.progressListeners.add(callback);
    return () => this.progressListeners.delete(callback);
  }

  /**
   * Registers a callback for branch state changes
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  onBranch(callback) {
    this.branchListeners.add(callback);
    return () => this.branchListeners.delete(callback);
  }

  /**
   * Cleans up listener sets
   */
  dispose() {
    this.progressListeners.clear();
    this.branchListeners.clear();
  }
}

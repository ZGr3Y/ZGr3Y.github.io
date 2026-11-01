import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IdleManager } from '../src/core/IdleManager.js';

describe('IdleManager (5s Progressive Slow-Motion & Power Damping)', () => {
  let idleManager;

  beforeEach(() => {
    // Abilitiamo i fake timers di Vitest per manipolare il tempo in millisecondi
    // senza dover attendere realmente 5 secondi di orologio
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (idleManager) {
      idleManager.dispose();
      idleManager = null;
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('inizializza con stato attivo e velocità massima (1.0)', () => {
    idleManager = new IdleManager({ idleTimeoutMs: 5000 });

    expect(idleManager.isIdle()).toBe(false);
    expect(idleManager.getSpeedFactor()).toBe(1.0);
  });

  it('rimane attivo a 4999ms e scatta in idle esattamente a 5000ms di inattività', () => {
    const onIdleSpy = vi.fn();
    idleManager = new IdleManager({ idleTimeoutMs: 5000, onIdle: onIdleSpy });

    // Avanziamo il tempo a 4999ms (1ms prima della soglia)
    vi.advanceTimersByTime(4999);
    idleManager.update(0.016);
    expect(idleManager.isIdle()).toBe(false);
    expect(onIdleSpy).not.toHaveBeenCalled();

    // Avanziamo di 1ms aggiuntivo: raggiungiamo i 5000ms
    vi.advanceTimersByTime(1);
    idleManager.update(0.016);
    expect(idleManager.isIdle()).toBe(true);
    expect(onIdleSpy).toHaveBeenCalledTimes(1);
  });

  it('decelera progressivamente in slow-motion verso 0.0 dopo essere entrato in idle', () => {
    idleManager = new IdleManager({ idleTimeoutMs: 5000 });

    // Scatta l'idle a 5s
    vi.advanceTimersByTime(5000);
    idleManager.update(0.016);
    expect(idleManager.isIdle()).toBe(true);

    // Verifichiamo che la velocità NON si azzeri bruscamente, ma deceleri fluidamente
    const speedAfter1Frame = idleManager.getSpeedFactor();
    expect(speedAfter1Frame).toBeLessThan(1.0);
    expect(speedAfter1Frame).toBeGreaterThan(0.0);

    // Simuliamo 2 secondi di frame render (delta 0.016s per ~120 frames)
    for (let i = 0; i < 120; i++) {
      vi.advanceTimersByTime(16);
      idleManager.update(0.016);
    }

    // La velocità deve essere scesa progressivamente a 0.0 (fermo completo / standby)
    expect(idleManager.getSpeedFactor()).toBeCloseTo(0.0, 2);
  });

  it('si risveglia all attività e riaccelera progressivamente da 0.0 verso 1.0', () => {
    const onWakeSpy = vi.fn();
    idleManager = new IdleManager({ idleTimeoutMs: 5000, onWake: onWakeSpy });

    // Mandiamo in idle completo
    vi.advanceTimersByTime(5000);
    for (let i = 0; i < 120; i++) {
      vi.advanceTimersByTime(16);
      idleManager.update(0.016);
    }
    expect(idleManager.getSpeedFactor()).toBeCloseTo(0.0, 2);

    // Registriamo attività utente (es. puntatore mosso o tocco)
    idleManager.recordActivity();

    expect(idleManager.isIdle()).toBe(false);
    expect(onWakeSpy).toHaveBeenCalledTimes(1);

    // La velocità deve ripartire progressivamente senza scatti
    idleManager.update(0.016);
    expect(idleManager.getSpeedFactor()).toBeGreaterThan(0.0);

    // Dopo altri ~120 frame di attività, torna a pieno regime (1.0)
    for (let i = 0; i < 120; i++) {
      vi.advanceTimersByTime(16);
      idleManager.update(0.016);
    }
    expect(idleManager.getSpeedFactor()).toBeCloseTo(1.0, 2);
  });

  it('va in pausa immediata se la scheda del browser viene nascosta (Page Visibility API)', () => {
    idleManager = new IdleManager({ idleTimeoutMs: 5000 });

    // Simuliamo l'utente che cambia scheda nel browser
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(idleManager.isIdle()).toBe(true);
    idleManager.update(0.016);
    // In background, il rendering deve frenare subito a 0 per risparmiare 100% GPU
    expect(idleManager.getSpeedFactor()).toBe(0.0);

    // L'utente torna sulla scheda
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(idleManager.isIdle()).toBe(false);
  });

  it('rimuove correttamente i listener di eventi alla distruzione (dispose)', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    idleManager = new IdleManager({ idleTimeoutMs: 5000 });

    idleManager.dispose();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});

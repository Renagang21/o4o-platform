/**
 * EngineManager
 *
 * Phase 5: Manages RenderingEngine instances for DisplaySlots.
 *
 * Responsibilities:
 * - Create/destroy engines per slot
 * - Route commands to correct engine
 * - Ensure one engine per slot
 *
 * Does NOT:
 * - Make business decisions
 * - Handle scheduling
 * - Interpret content meaning
 */

import { DataSource } from 'typeorm';
import { RenderingEngine, EngineState, EngineEvent, EngineEventListener } from './RenderingEngine.js';

/**
 * EngineManager
 */
export class EngineManager {
  private engines: Map<string, RenderingEngine> = new Map();
  private dataSource: DataSource;
  private globalListeners: Set<EngineEventListener> = new Set();

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  /**
   * Get or create engine for a DisplaySlot
   */
  getOrCreateEngine(displaySlotId: string): RenderingEngine {
    let engine = this.engines.get(displaySlotId);

    if (!engine) {
      engine = new RenderingEngine(displaySlotId, this.dataSource);

      // Forward events to global listeners
      engine.addEventListener((event) => {
        this.globalListeners.forEach((listener) => {
          try {
            listener(event);
          } catch (err) {
            console.error('[EngineManager] Listener error:', err);
          }
        });
      });

      this.engines.set(displaySlotId, engine);
    }

    return engine;
  }

  /**
   * Get engine for a DisplaySlot (without creating)
   */
  getEngine(displaySlotId: string): RenderingEngine | null {
    return this.engines.get(displaySlotId) || null;
  }

  /**
   * Check if engine exists for a DisplaySlot
   */
  hasEngine(displaySlotId: string): boolean {
    return this.engines.has(displaySlotId);
  }

  /**
   * Start playback for an ActionExecution
   */
  async startExecution(displaySlotId: string, executionId: string): Promise<boolean> {
    const engine = this.getOrCreateEngine(displaySlotId);
    return engine.start(executionId);
  }

  /**
   * Pause playback on a slot
   */
  async pauseSlot(displaySlotId: string): Promise<void> {
    const engine = this.getEngine(displaySlotId);
    if (engine) {
      await engine.pause();
    }
  }

  /**
   * Resume playback on a slot
   */
  async resumeSlot(displaySlotId: string): Promise<void> {
    const engine = this.getEngine(displaySlotId);
    if (engine) {
      await engine.resume();
    }
  }

  /**
   * Stop playback on a slot
   */
  async stopSlot(displaySlotId: string): Promise<void> {
    const engine = this.getEngine(displaySlotId);
    if (engine) {
      await engine.stop();
    }
  }

  /**
   * Skip to next item on a slot
   */
  async skipToNext(displaySlotId: string): Promise<void> {
    const engine = this.getEngine(displaySlotId);
    if (engine) {
      await engine.skipToNext();
    }
  }

  /**
   * Remove engine for a slot
   */
  removeEngine(displaySlotId: string): void {
    const engine = this.engines.get(displaySlotId);
    if (engine) {
      engine.dispose();
      this.engines.delete(displaySlotId);
    }
  }

  /**
   * Get slot status
   */
  getSlotStatus(displaySlotId: string): {
    hasEngine: boolean;
    state: EngineState | null;
    executionId: string | null;
  } {
    const engine = this.getEngine(displaySlotId);
    return {
      hasEngine: engine !== null,
      state: engine?.state || null,
      executionId: engine?.currentExecution || null,
    };
  }

  /**
   * Get all active slots
   */
  getActiveSlots(): string[] {
    const activeSlots: string[] = [];
    this.engines.forEach((engine, slotId) => {
      if (engine.state === EngineState.RUNNING || engine.state === EngineState.PAUSED) {
        activeSlots.push(slotId);
      }
    });
    return activeSlots;
  }

  /**
   * Get all slots with engines
   */
  getAllSlots(): string[] {
    return Array.from(this.engines.keys());
  }

  /**
   * Add global event listener
   */
  addEventListener(listener: EngineEventListener): void {
    this.globalListeners.add(listener);
  }

  /**
   * Remove global event listener
   */
  removeEventListener(listener: EngineEventListener): void {
    this.globalListeners.delete(listener);
  }

  /**
   * Cleanup all engines
   */
  async stopAll(): Promise<void> {
    const stopPromises: Promise<void>[] = [];

    this.engines.forEach((engine) => {
      stopPromises.push(engine.stop());
    });

    await Promise.all(stopPromises);
  }

  /**
   * Dispose all engines and cleanup
   */
  dispose(): void {
    this.engines.forEach((engine) => {
      engine.dispose();
    });
    this.engines.clear();
    this.globalListeners.clear();
  }
}

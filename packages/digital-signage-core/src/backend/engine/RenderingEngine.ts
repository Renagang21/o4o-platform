/**
 * RenderingEngine
 *
 * Phase 5: Central engine for managing media playback on a DisplaySlot.
 *
 * Responsibilities:
 * - Manage ActionExecution lifecycle
 * - Sequence through MediaListItems
 * - Create and control players
 * - Handle state transitions
 * - Error recovery (skip/stop)
 *
 * Rules:
 * - One DisplaySlot = One RenderingEngine instance
 * - Slot occupancy release = Engine termination
 *
 * Does NOT:
 * - Interpret content meaning
 * - Make business decisions
 * - Handle scheduling
 */

import { DataSource, Repository } from 'typeorm';
import { ActionExecution, ActionExecutionStatus } from '../entities/ActionExecution.entity.js';
import { MediaListItem } from '../entities/MediaListItem.entity.js';
import { Display } from '../entities/Display.entity.js';
import {
  PlayerAdapter,
  PlayerState,
  PlayerEventType,
  PlayerEvent,
  PlayerConfig,
} from '../player/PlayerAdapter.js';
import { PlayerFactory } from '../player/PlayerFactory.js';

/**
 * Engine State
 */
export enum EngineState {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error',
}

/**
 * Engine Event Types
 */
export enum EngineEventType {
  STATE_CHANGE = 'state_change',
  ITEM_START = 'item_start',
  ITEM_END = 'item_end',
  ERROR = 'error',
  COMPLETED = 'completed',
}

/**
 * Engine Event
 */
export interface EngineEvent {
  type: EngineEventType;
  engineId: string;
  state?: EngineState;
  itemId?: string;
  itemIndex?: number;
  error?: Error;
  timestamp: Date;
}

/**
 * Engine Event Listener
 */
export type EngineEventListener = (event: EngineEvent) => void;

/**
 * Heartbeat check interval (ms)
 */
const HEARTBEAT_CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Max time without heartbeat before considering display offline (ms)
 */
const HEARTBEAT_TIMEOUT = 60000; // 60 seconds

/**
 * RenderingEngine
 */
export class RenderingEngine {
  readonly id: string;
  readonly displaySlotId: string;

  private dataSource: DataSource;
  private _state: EngineState = EngineState.IDLE;
  private executionId: string | null = null;
  private mediaListItems: MediaListItem[] = [];
  private currentItemIndex: number = -1;
  private currentPlayer: PlayerAdapter | null = null;
  private listeners: Set<EngineEventListener> = new Set();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private displayId: string | null = null;

  constructor(displaySlotId: string, dataSource: DataSource) {
    this.id = `engine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.displaySlotId = displaySlotId;
    this.dataSource = dataSource;
  }

  get state(): EngineState {
    return this._state;
  }

  get currentExecution(): string | null {
    return this.executionId;
  }

  /**
   * Start rendering for an ActionExecution
   */
  async start(executionId: string): Promise<boolean> {
    if (this._state === EngineState.RUNNING || this._state === EngineState.PAUSED) {
      // Already running, stop first
      await this.stop();
    }

    try {
      // 1. Fetch ActionExecution
      const executionRepo = this.dataSource.getRepository(ActionExecution);
      const execution = await executionRepo.findOne({ where: { id: executionId } });

      if (!execution) {
        this.emitError(new Error(`ActionExecution "${executionId}" not found`));
        return false;
      }

      if (execution.status !== ActionExecutionStatus.RUNNING) {
        this.emitError(new Error(`ActionExecution is not in RUNNING state: ${execution.status}`));
        return false;
      }

      if (!execution.mediaListId) {
        this.emitError(new Error('ActionExecution has no mediaListId'));
        return false;
      }

      this.executionId = executionId;
      this.displayId = execution.displayId;

      // 2. Fetch MediaListItems
      const itemRepo = this.dataSource.getRepository(MediaListItem);
      this.mediaListItems = await itemRepo.find({
        where: { mediaListId: execution.mediaListId, isActive: true },
        relations: ['mediaSource'],
        order: { sortOrder: 'ASC' },
      });

      if (this.mediaListItems.length === 0) {
        this.emitError(new Error('MediaList has no active items'));
        await this.markExecutionCompleted();
        return false;
      }

      // 3. Start playback
      this.currentItemIndex = -1;
      this.setState(EngineState.RUNNING);
      this.startHeartbeatCheck();

      // 4. Play first item
      await this.playNextItem();

      return true;
    } catch (error) {
      this.emitError(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    if (this._state !== EngineState.RUNNING) return;

    if (this.currentPlayer) {
      await this.currentPlayer.pause();
    }

    this.setState(EngineState.PAUSED);

    // Update ActionExecution status
    if (this.executionId) {
      await this.updateExecutionStatus(ActionExecutionStatus.PAUSED);
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (this._state !== EngineState.PAUSED) return;

    if (this.currentPlayer) {
      await this.currentPlayer.play();
    }

    this.setState(EngineState.RUNNING);

    // Update ActionExecution status
    if (this.executionId) {
      await this.updateExecutionStatus(ActionExecutionStatus.RUNNING);
    }
  }

  /**
   * Stop playback
   */
  async stop(): Promise<void> {
    this.stopHeartbeatCheck();

    if (this.currentPlayer) {
      await this.currentPlayer.stop();
      this.currentPlayer.dispose();
      this.currentPlayer = null;
    }

    this.setState(EngineState.STOPPED);
    this.currentItemIndex = -1;
    this.mediaListItems = [];

    // Update ActionExecution status
    if (this.executionId) {
      await this.updateExecutionStatus(ActionExecutionStatus.STOPPED);
      this.executionId = null;
    }

    this.emit({ type: EngineEventType.COMPLETED });
  }

  /**
   * Skip to next item
   */
  async skipToNext(): Promise<void> {
    if (this._state !== EngineState.RUNNING && this._state !== EngineState.PAUSED) return;

    await this.playNextItem();
  }

  /**
   * Play the next item in the list
   */
  private async playNextItem(): Promise<void> {
    // Cleanup current player
    if (this.currentPlayer) {
      await this.currentPlayer.stop();
      this.currentPlayer.dispose();
      this.currentPlayer = null;
    }

    // Move to next item
    this.currentItemIndex++;

    // Check if we've reached the end
    if (this.currentItemIndex >= this.mediaListItems.length) {
      await this.onPlaylistCompleted();
      return;
    }

    const item = this.mediaListItems[this.currentItemIndex];

    // Emit item start event
    this.emit({
      type: EngineEventType.ITEM_START,
      itemId: item.id,
      itemIndex: this.currentItemIndex,
    });

    try {
      // Create player config
      const config: PlayerConfig = {
        mediaSourceId: item.mediaSourceId,
        sourceUrl: item.mediaSource?.sourceUrl || '',
        sourceType: item.mediaSource?.sourceType || '',
        mimeType: item.mediaSource?.mimeType || undefined,
        durationSeconds: item.displayDurationSeconds || item.mediaSource?.durationSeconds || undefined,
        metadata: {
          ...item.mediaSource?.metadata,
          ...item.metadata,
        },
      };

      // Create player
      this.currentPlayer = PlayerFactory.create(config);

      if (!this.currentPlayer) {
        throw new Error(`Failed to create player for item ${item.id}`);
      }

      // Listen for player events
      this.currentPlayer.addEventListener((event: PlayerEvent) => {
        this.onPlayerEvent(event, item);
      });

      // Start playback
      if (this._state === EngineState.RUNNING) {
        await this.currentPlayer.play();
      }
    } catch (error) {
      console.error(`[RenderingEngine] Error playing item ${item.id}:`, error);

      // Emit item end with error
      this.emit({
        type: EngineEventType.ITEM_END,
        itemId: item.id,
        itemIndex: this.currentItemIndex,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      // Skip to next item
      await this.playNextItem();
    }
  }

  /**
   * Handle player events
   */
  private async onPlayerEvent(event: PlayerEvent, item: MediaListItem): Promise<void> {
    switch (event.type) {
      case PlayerEventType.ENDED:
        // Item finished naturally
        this.emit({
          type: EngineEventType.ITEM_END,
          itemId: item.id,
          itemIndex: this.currentItemIndex,
        });

        // Play next item
        if (this._state === EngineState.RUNNING) {
          await this.playNextItem();
        }
        break;

      case PlayerEventType.ERROR:
        // Item failed, skip to next
        this.emit({
          type: EngineEventType.ITEM_END,
          itemId: item.id,
          itemIndex: this.currentItemIndex,
          error: event.error,
        });

        if (this._state === EngineState.RUNNING) {
          await this.playNextItem();
        }
        break;

      case PlayerEventType.STATE_CHANGE:
        // Player state changed
        break;

      case PlayerEventType.PROGRESS:
        // Progress update
        break;
    }
  }

  /**
   * Called when playlist is completed
   */
  private async onPlaylistCompleted(): Promise<void> {
    await this.markExecutionCompleted();
    this.setState(EngineState.STOPPED);
    this.emit({ type: EngineEventType.COMPLETED });
  }

  /**
   * Mark ActionExecution as completed
   */
  private async markExecutionCompleted(): Promise<void> {
    if (!this.executionId) return;

    try {
      const repo = this.dataSource.getRepository(ActionExecution);
      await repo.update(this.executionId, {
        status: ActionExecutionStatus.COMPLETED,
        completedAt: new Date(),
      });
    } catch (error) {
      console.error('[RenderingEngine] Failed to mark execution as completed:', error);
    }
  }

  /**
   * Update ActionExecution status
   */
  private async updateExecutionStatus(status: ActionExecutionStatus): Promise<void> {
    if (!this.executionId) return;

    try {
      const repo = this.dataSource.getRepository(ActionExecution);
      const updates: Partial<ActionExecution> = { status };

      if (status === ActionExecutionStatus.PAUSED) {
        updates.pausedAt = new Date();
      } else if (status === ActionExecutionStatus.RUNNING) {
        updates.pausedAt = null;
      } else if (status === ActionExecutionStatus.STOPPED || status === ActionExecutionStatus.COMPLETED) {
        updates.completedAt = new Date();
      }

      await repo.update(this.executionId, updates);
    } catch (error) {
      console.error('[RenderingEngine] Failed to update execution status:', error);
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatCheck(): void {
    this.stopHeartbeatCheck();

    this.heartbeatTimer = setInterval(async () => {
      await this.checkDisplayHeartbeat();
    }, HEARTBEAT_CHECK_INTERVAL);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeatCheck(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Check display heartbeat
   */
  private async checkDisplayHeartbeat(): Promise<void> {
    if (!this.displayId) return;

    try {
      const displayRepo = this.dataSource.getRepository(Display);
      const display = await displayRepo.findOne({ where: { id: this.displayId } });

      if (!display) {
        console.warn(`[RenderingEngine] Display ${this.displayId} not found`);
        return;
      }

      // Check if display is offline
      if (display.status === 'offline') {
        console.warn(`[RenderingEngine] Display ${this.displayId} is offline`);
        await this.onDisplayOffline();
        return;
      }

      // Check heartbeat timeout
      if (display.lastHeartbeat) {
        const lastHeartbeatTime = new Date(display.lastHeartbeat).getTime();
        const now = Date.now();

        if (now - lastHeartbeatTime > HEARTBEAT_TIMEOUT) {
          console.warn(`[RenderingEngine] Display ${this.displayId} heartbeat timeout`);
          await this.onDisplayOffline();
        }
      }
    } catch (error) {
      console.error('[RenderingEngine] Heartbeat check failed:', error);
    }
  }

  /**
   * Handle display offline
   */
  private async onDisplayOffline(): Promise<void> {
    this.stopHeartbeatCheck();

    if (this.currentPlayer) {
      await this.currentPlayer.stop();
      this.currentPlayer.dispose();
      this.currentPlayer = null;
    }

    this.setState(EngineState.ERROR);

    // Mark execution as failed
    if (this.executionId) {
      try {
        const repo = this.dataSource.getRepository(ActionExecution);
        await repo.update(this.executionId, {
          status: ActionExecutionStatus.FAILED,
          completedAt: new Date(),
          errorMessage: 'Display offline or heartbeat timeout',
        });
      } catch (error) {
        console.error('[RenderingEngine] Failed to mark execution as failed:', error);
      }
    }

    this.emit({
      type: EngineEventType.ERROR,
      error: new Error('Display offline or heartbeat timeout'),
    });
  }

  /**
   * Add event listener
   */
  addEventListener(listener: EngineEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: EngineEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Set engine state
   */
  private setState(newState: EngineState): void {
    if (this._state !== newState) {
      this._state = newState;
      this.emit({ type: EngineEventType.STATE_CHANGE, state: newState });
    }
  }

  /**
   * Emit engine event
   */
  private emit(event: Omit<EngineEvent, 'engineId' | 'timestamp'>): void {
    const fullEvent: EngineEvent = {
      ...event,
      engineId: this.id,
      timestamp: new Date(),
    };

    this.listeners.forEach((listener) => {
      try {
        listener(fullEvent);
      } catch (err) {
        console.error(`[RenderingEngine:${this.id}] Listener error:`, err);
      }
    });
  }

  /**
   * Emit error event
   */
  private emitError(error: Error): void {
    this.setState(EngineState.ERROR);
    this.emit({ type: EngineEventType.ERROR, error });
  }

  /**
   * Dispose engine and cleanup resources
   */
  dispose(): void {
    this.stopHeartbeatCheck();

    if (this.currentPlayer) {
      this.currentPlayer.stop().catch(() => {});
      this.currentPlayer.dispose();
      this.currentPlayer = null;
    }

    this.listeners.clear();
    this._state = EngineState.STOPPED;
  }
}

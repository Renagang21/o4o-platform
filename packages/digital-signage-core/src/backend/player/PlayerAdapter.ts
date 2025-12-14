/**
 * PlayerAdapter Interface
 *
 * Phase 5: Defines the contract for all media players.
 *
 * Core responsibilities:
 * - play/pause/stop lifecycle
 * - State reporting (isAlive)
 *
 * Does NOT:
 * - Interpret content meaning
 * - Make business decisions
 * - Handle scheduling
 */

/**
 * Player State
 */
export enum PlayerState {
  IDLE = 'idle',
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error',
}

/**
 * Media Type (for player selection)
 */
export enum MediaType {
  YOUTUBE = 'youtube',
  VIMEO = 'vimeo',
  INTERNAL_VIDEO = 'internal_video',
  IMAGE_SLIDE = 'image_slide',
  UNKNOWN = 'unknown',
}

/**
 * Player Event Types
 */
export enum PlayerEventType {
  STATE_CHANGE = 'state_change',
  PROGRESS = 'progress',
  ERROR = 'error',
  ENDED = 'ended',
}

/**
 * Player Event
 */
export interface PlayerEvent {
  type: PlayerEventType;
  playerId: string;
  state?: PlayerState;
  progress?: number; // 0-100 percentage
  error?: Error;
  timestamp: Date;
}

/**
 * Player Event Listener
 */
export type PlayerEventListener = (event: PlayerEvent) => void;

/**
 * Player Configuration
 */
export interface PlayerConfig {
  mediaSourceId: string;
  sourceUrl: string;
  sourceType: string;
  mimeType?: string;
  durationSeconds?: number;
  metadata?: Record<string, any>;
}

/**
 * PlayerAdapter Interface
 */
export interface PlayerAdapter {
  /**
   * Unique player instance ID
   */
  readonly id: string;

  /**
   * Current player state
   */
  readonly state: PlayerState;

  /**
   * Start or resume playback
   */
  play(): Promise<void>;

  /**
   * Pause playback
   */
  pause(): Promise<void>;

  /**
   * Stop playback and cleanup
   */
  stop(): Promise<void>;

  /**
   * Check if player is alive and responsive
   */
  isAlive(): boolean;

  /**
   * Get current playback progress (0-100)
   */
  getProgress(): number;

  /**
   * Add event listener
   */
  addEventListener(listener: PlayerEventListener): void;

  /**
   * Remove event listener
   */
  removeEventListener(listener: PlayerEventListener): void;

  /**
   * Cleanup resources
   */
  dispose(): void;
}

/**
 * Abstract base class for players
 */
export abstract class BasePlayer implements PlayerAdapter {
  readonly id: string;
  protected _state: PlayerState = PlayerState.IDLE;
  protected _progress: number = 0;
  protected listeners: Set<PlayerEventListener> = new Set();
  protected config: PlayerConfig;

  constructor(config: PlayerConfig) {
    this.id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.config = config;
  }

  get state(): PlayerState {
    return this._state;
  }

  abstract play(): Promise<void>;
  abstract pause(): Promise<void>;
  abstract stop(): Promise<void>;

  isAlive(): boolean {
    return this._state !== PlayerState.ERROR && this._state !== PlayerState.STOPPED;
  }

  getProgress(): number {
    return this._progress;
  }

  addEventListener(listener: PlayerEventListener): void {
    this.listeners.add(listener);
  }

  removeEventListener(listener: PlayerEventListener): void {
    this.listeners.delete(listener);
  }

  protected emit(event: Omit<PlayerEvent, 'playerId' | 'timestamp'>): void {
    const fullEvent: PlayerEvent = {
      ...event,
      playerId: this.id,
      timestamp: new Date(),
    };
    this.listeners.forEach((listener) => {
      try {
        listener(fullEvent);
      } catch (err) {
        console.error(`[Player:${this.id}] Listener error:`, err);
      }
    });
  }

  protected setState(newState: PlayerState): void {
    if (this._state !== newState) {
      this._state = newState;
      this.emit({ type: PlayerEventType.STATE_CHANGE, state: newState });
    }
  }

  protected setProgress(progress: number): void {
    this._progress = Math.max(0, Math.min(100, progress));
    this.emit({ type: PlayerEventType.PROGRESS, progress: this._progress });
  }

  protected emitError(error: Error): void {
    this.setState(PlayerState.ERROR);
    this.emit({ type: PlayerEventType.ERROR, error });
  }

  protected emitEnded(): void {
    this.emit({ type: PlayerEventType.ENDED });
  }

  dispose(): void {
    this.listeners.clear();
    this._state = PlayerState.STOPPED;
  }
}

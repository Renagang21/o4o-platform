/**
 * PlaybackEngine
 *
 * Sprint 2-4: Production-grade playback controller
 * - Queue-based content management
 * - Preloading for seamless transitions
 * - Error recovery with retry logic
 * - Event-driven architecture
 *
 * Phase 2: Digital Signage Production Upgrade
 */

import type { PlaylistItem, MediaContent, ScheduleRule } from '../types/signage';

// ============================================================================
// Types & Enums
// ============================================================================

export enum EngineState {
  IDLE = 'idle',
  LOADING = 'loading',
  PLAYING = 'playing',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped',
}

export enum PlaybackEventType {
  STATE_CHANGE = 'state_change',
  ITEM_START = 'item_start',
  ITEM_END = 'item_end',
  ITEM_ERROR = 'item_error',
  QUEUE_UPDATE = 'queue_update',
  PRELOAD_START = 'preload_start',
  PRELOAD_COMPLETE = 'preload_complete',
  ENGINE_ERROR = 'engine_error',
}

export interface PlaybackEvent {
  type: PlaybackEventType;
  timestamp: Date;
  state?: EngineState;
  itemId?: string;
  itemIndex?: number;
  error?: Error;
  data?: Record<string, unknown>;
}

export type PlaybackEventListener = (event: PlaybackEvent) => void;

export interface PlaybackQueueItem {
  id: string;
  playlistItemId: string;
  media: MediaContent;
  duration: number; // in milliseconds
  order: number;
  preloaded: boolean;
  preloadElement?: HTMLImageElement | HTMLVideoElement;
  startedAt?: Date;
  retryCount: number;
  metadata: Record<string, unknown>;
}

export interface EngineConfig {
  preloadAhead: number; // Number of items to preload
  maxRetries: number;
  retryDelayMs: number;
  transitionDurationMs: number;
  defaultDurationMs: number;
  autoAdvance: boolean;
  loop: boolean;
}

const DEFAULT_CONFIG: EngineConfig = {
  preloadAhead: 2,
  maxRetries: 3,
  retryDelayMs: 1000,
  transitionDurationMs: 300,
  defaultDurationMs: 10000,
  autoAdvance: true,
  loop: true,
};

// ============================================================================
// PlaybackEngine Class
// ============================================================================

export class PlaybackEngine {
  private _state: EngineState = EngineState.IDLE;
  private queue: PlaybackQueueItem[] = [];
  private currentIndex: number = -1;
  private config: EngineConfig;
  private listeners: Set<PlaybackEventListener> = new Set();
  private playbackTimer: number | null = null;
  private preloadPromises: Map<string, Promise<void>> = new Map();
  private abortController: AbortController | null = null;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  get state(): EngineState {
    return this._state;
  }

  get currentItem(): PlaybackQueueItem | null {
    return this.currentIndex >= 0 && this.currentIndex < this.queue.length
      ? this.queue[this.currentIndex]
      : null;
  }

  get queueLength(): number {
    return this.queue.length;
  }

  get currentPosition(): number {
    return this.currentIndex;
  }

  /**
   * Load playlist items into the queue
   */
  async loadPlaylist(items: PlaylistItem[]): Promise<void> {
    // Stop any current playback
    this.stop();

    // Clear existing queue
    this.queue = [];
    this.currentIndex = -1;

    // Build queue from playlist items
    this.queue = items
      .filter((item) => item.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((item, index) => this.createQueueItem(item, index));

    this.emit({ type: PlaybackEventType.QUEUE_UPDATE, data: { length: this.queue.length } });

    // Start preloading first items
    await this.preloadNextItems();
  }

  /**
   * Start or resume playback
   */
  async play(): Promise<void> {
    if (this._state === EngineState.PLAYING) {
      return;
    }

    if (this.queue.length === 0) {
      this.setState(EngineState.IDLE);
      return;
    }

    this.abortController = new AbortController();

    // If paused, resume
    if (this._state === EngineState.PAUSED && this.currentIndex >= 0) {
      this.setState(EngineState.PLAYING);
      this.scheduleNextAdvance();
      return;
    }

    // Start from beginning or current position
    if (this.currentIndex < 0) {
      this.currentIndex = 0;
    }

    this.setState(EngineState.PLAYING);
    await this.playCurrentItem();
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this._state !== EngineState.PLAYING) {
      return;
    }

    this.clearPlaybackTimer();
    this.setState(EngineState.PAUSED);
  }

  /**
   * Stop playback completely
   */
  stop(): void {
    this.clearPlaybackTimer();
    this.abortController?.abort();
    this.abortController = null;

    this.currentIndex = -1;
    this.setState(EngineState.STOPPED);
  }

  /**
   * Skip to next item
   */
  async next(): Promise<void> {
    if (this.queue.length === 0) return;

    const wasPlaying = this._state === EngineState.PLAYING;
    this.clearPlaybackTimer();

    // Emit item end for current
    if (this.currentItem) {
      this.emit({
        type: PlaybackEventType.ITEM_END,
        itemId: this.currentItem.id,
        itemIndex: this.currentIndex,
      });
    }

    // Advance index
    this.currentIndex++;

    // Handle loop or end
    if (this.currentIndex >= this.queue.length) {
      if (this.config.loop) {
        this.currentIndex = 0;
      } else {
        this.stop();
        return;
      }
    }

    if (wasPlaying) {
      await this.playCurrentItem();
    }
  }

  /**
   * Skip to previous item
   */
  async previous(): Promise<void> {
    if (this.queue.length === 0) return;

    const wasPlaying = this._state === EngineState.PLAYING;
    this.clearPlaybackTimer();

    // Emit item end for current
    if (this.currentItem) {
      this.emit({
        type: PlaybackEventType.ITEM_END,
        itemId: this.currentItem.id,
        itemIndex: this.currentIndex,
      });
    }

    // Go back
    this.currentIndex--;

    if (this.currentIndex < 0) {
      if (this.config.loop) {
        this.currentIndex = this.queue.length - 1;
      } else {
        this.currentIndex = 0;
      }
    }

    if (wasPlaying) {
      await this.playCurrentItem();
    }
  }

  /**
   * Jump to specific index
   */
  async jumpTo(index: number): Promise<void> {
    if (index < 0 || index >= this.queue.length) return;

    const wasPlaying = this._state === EngineState.PLAYING;
    this.clearPlaybackTimer();

    if (this.currentItem) {
      this.emit({
        type: PlaybackEventType.ITEM_END,
        itemId: this.currentItem.id,
        itemIndex: this.currentIndex,
      });
    }

    this.currentIndex = index;

    if (wasPlaying) {
      await this.playCurrentItem();
    }
  }

  /**
   * Update config at runtime
   */
  updateConfig(updates: Partial<EngineConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Add event listener
   */
  addEventListener(listener: PlaybackEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: PlaybackEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();
    this.listeners.clear();
    this.clearPreloads();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createQueueItem(item: PlaylistItem, order: number): PlaybackQueueItem {
    const duration = this.calculateDuration(item);

    return {
      id: `queue_${item.id}_${Date.now()}`,
      playlistItemId: item.id,
      media: item.media,
      duration,
      order,
      preloaded: false,
      retryCount: 0,
      metadata: {
        ...item.settings,
        transitionEffect: item.transitionEffect,
        transitionDuration: item.transitionDuration,
      },
    };
  }

  private calculateDuration(item: PlaylistItem): number {
    // Check item-level duration override
    if (item.displayDuration && item.displayDuration > 0) {
      return item.displayDuration * 1000;
    }

    // For videos, use actual duration if known
    if (item.media.mediaType === 'video' && item.media.duration) {
      return item.media.duration * 1000;
    }

    // Default duration
    return this.config.defaultDurationMs;
  }

  private async playCurrentItem(): Promise<void> {
    const item = this.currentItem;
    if (!item) {
      this.stop();
      return;
    }

    // Wait for preload if not ready
    if (!item.preloaded) {
      this.setState(EngineState.LOADING);
      try {
        await this.preloadItem(item);
      } catch (error) {
        await this.handleItemError(item, error as Error);
        return;
      }
    }

    this.setState(EngineState.PLAYING);
    item.startedAt = new Date();

    this.emit({
      type: PlaybackEventType.ITEM_START,
      itemId: item.id,
      itemIndex: this.currentIndex,
      data: { media: item.media },
    });

    // Schedule next advance if auto-advance enabled
    if (this.config.autoAdvance) {
      this.scheduleNextAdvance();
    }

    // Preload upcoming items
    this.preloadNextItems();
  }

  private scheduleNextAdvance(): void {
    this.clearPlaybackTimer();

    const item = this.currentItem;
    if (!item) return;

    // For video, we wait for video ended event (handled externally)
    // For other content, use timer
    if (item.media.mediaType === 'video') {
      // Video duration is handled by the video element's onEnded
      return;
    }

    this.playbackTimer = window.setTimeout(() => {
      this.next();
    }, item.duration);
  }

  private clearPlaybackTimer(): void {
    if (this.playbackTimer !== null) {
      window.clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  private async preloadNextItems(): Promise<void> {
    const startIndex = Math.max(0, this.currentIndex);
    const endIndex = Math.min(this.queue.length, startIndex + this.config.preloadAhead + 1);

    for (let i = startIndex; i < endIndex; i++) {
      const item = this.queue[i];
      if (item && !item.preloaded && !this.preloadPromises.has(item.id)) {
        const promise = this.preloadItem(item);
        this.preloadPromises.set(item.id, promise);
        promise.finally(() => this.preloadPromises.delete(item.id));
      }
    }
  }

  private async preloadItem(item: PlaybackQueueItem): Promise<void> {
    if (item.preloaded) return;

    this.emit({
      type: PlaybackEventType.PRELOAD_START,
      itemId: item.id,
      data: { mediaType: item.media.mediaType },
    });

    try {
      switch (item.media.mediaType) {
        case 'image':
          await this.preloadImage(item);
          break;
        case 'video':
          await this.preloadVideo(item);
          break;
        // For other types (html, text), no preloading needed
        default:
          item.preloaded = true;
      }

      this.emit({
        type: PlaybackEventType.PRELOAD_COMPLETE,
        itemId: item.id,
      });
    } catch (error) {
      console.error(`[PlaybackEngine] Preload failed for ${item.id}:`, error);
      throw error;
    }
  }

  private preloadImage(item: PlaybackQueueItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        item.preloadElement = img;
        item.preloaded = true;
        resolve();
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${item.media.url}`));
      };

      img.src = item.media.url || '';
    });
  }

  private preloadVideo(item: PlaybackQueueItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;

      const handleCanPlay = () => {
        video.removeEventListener('canplaythrough', handleCanPlay);
        video.removeEventListener('error', handleError);
        item.preloadElement = video;
        item.preloaded = true;
        resolve();
      };

      const handleError = () => {
        video.removeEventListener('canplaythrough', handleCanPlay);
        video.removeEventListener('error', handleError);
        reject(new Error(`Failed to load video: ${item.media.url}`));
      };

      video.addEventListener('canplaythrough', handleCanPlay);
      video.addEventListener('error', handleError);

      video.src = item.media.url || '';
      video.load();
    });
  }

  private async handleItemError(item: PlaybackQueueItem, error: Error): Promise<void> {
    item.retryCount++;

    this.emit({
      type: PlaybackEventType.ITEM_ERROR,
      itemId: item.id,
      itemIndex: this.currentIndex,
      error,
      data: { retryCount: item.retryCount },
    });

    // Retry if under limit
    if (item.retryCount < this.config.maxRetries) {
      console.warn(`[PlaybackEngine] Retrying item ${item.id} (attempt ${item.retryCount + 1})`);
      await new Promise((r) => setTimeout(r, this.config.retryDelayMs));
      await this.playCurrentItem();
      return;
    }

    // Skip to next item after max retries
    console.error(`[PlaybackEngine] Max retries reached for ${item.id}, skipping`);
    await this.next();
  }

  private clearPreloads(): void {
    this.preloadPromises.clear();
    this.queue.forEach((item) => {
      if (item.preloadElement) {
        if (item.preloadElement instanceof HTMLVideoElement) {
          item.preloadElement.src = '';
          item.preloadElement.load();
        }
        item.preloadElement = undefined;
      }
    });
  }

  private setState(state: EngineState): void {
    if (this._state !== state) {
      this._state = state;
      this.emit({ type: PlaybackEventType.STATE_CHANGE, state });
    }
  }

  private emit(event: Omit<PlaybackEvent, 'timestamp'>): void {
    const fullEvent: PlaybackEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.listeners.forEach((listener) => {
      try {
        listener(fullEvent);
      } catch (err) {
        console.error('[PlaybackEngine] Listener error:', err);
      }
    });
  }

  /**
   * Handle video ended event from external component
   * Call this when video element fires 'ended' event
   */
  onVideoEnded(): void {
    if (this._state === EngineState.PLAYING) {
      this.next();
    }
  }

  /**
   * Get preloaded element for current item
   */
  getPreloadedElement(): HTMLImageElement | HTMLVideoElement | undefined {
    return this.currentItem?.preloadElement;
  }

  /**
   * Get queue status for debugging/monitoring
   */
  getQueueStatus(): { total: number; preloaded: number; current: number } {
    return {
      total: this.queue.length,
      preloaded: this.queue.filter((q) => q.preloaded).length,
      current: this.currentIndex,
    };
  }
}

// Export singleton factory
let engineInstance: PlaybackEngine | null = null;

export function getPlaybackEngine(config?: Partial<EngineConfig>): PlaybackEngine {
  if (!engineInstance) {
    engineInstance = new PlaybackEngine(config);
  }
  return engineInstance;
}

export function resetPlaybackEngine(): void {
  if (engineInstance) {
    engineInstance.dispose();
    engineInstance = null;
  }
}

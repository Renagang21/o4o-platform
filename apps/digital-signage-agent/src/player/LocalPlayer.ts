/**
 * Local Player
 *
 * Lightweight player runtime for executing media playback
 * Phase 7: Device Agent
 *
 * Note: This is a minimal Node.js-based player controller.
 * In production, this would integrate with actual display systems.
 */

import { EventEmitter } from 'eventemitter3';
import { AgentLogger } from '../agent/AgentLogger';

export type PlayerType = 'youtube' | 'vimeo' | 'internal_video' | 'image_slide';
export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

export interface MediaPayload {
  id: string;
  name: string;
  type: string;
  url?: string;
  embedId?: string;
  playerType: PlayerType;
  duration?: number;
}

interface LocalPlayerEvents {
  statusChange: (status: PlayerStatus) => void;
  playbackComplete: () => void;
  error: (error: Error) => void;
}

export class LocalPlayer extends EventEmitter<LocalPlayerEvents> {
  private logger: AgentLogger;
  private status: PlayerStatus = 'idle';
  private currentMedia: MediaPayload | null = null;
  private playbackTimer: NodeJS.Timeout | null = null;
  private startTime: number | null = null;
  private pausedAt: number | null = null;

  constructor(logger: AgentLogger) {
    super();
    this.logger = logger;
  }

  /**
   * Start playback
   */
  async play(media: MediaPayload): Promise<void> {
    this.logger.info('Starting playback', {
      mediaId: media.id,
      type: media.playerType,
    });

    // Stop any current playback
    this.stop();

    this.currentMedia = media;
    this.setStatus('loading');

    try {
      // Simulate loading time
      await this.simulateLoad(media);

      this.setStatus('playing');
      this.startTime = Date.now();
      this.pausedAt = null;

      // If duration is set, schedule completion
      if (media.duration && media.duration > 0) {
        this.scheduleCompletion(media.duration * 1000);
      }

      this.logger.info('Playback started', { mediaId: media.id });
    } catch (error) {
      this.setStatus('error');
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.status !== 'playing') {
      this.logger.warn('Cannot pause: not playing');
      return;
    }

    this.logger.info('Pausing playback');
    this.pausedAt = Date.now();

    // Clear completion timer
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }

    this.setStatus('paused');
  }

  /**
   * Resume playback
   */
  resume(): void {
    if (this.status !== 'paused') {
      this.logger.warn('Cannot resume: not paused');
      return;
    }

    this.logger.info('Resuming playback');

    // Calculate remaining time
    if (this.currentMedia?.duration && this.startTime && this.pausedAt) {
      const elapsed = this.pausedAt - this.startTime;
      const remaining = (this.currentMedia.duration * 1000) - elapsed;
      if (remaining > 0) {
        this.scheduleCompletion(remaining);
      }
    }

    this.pausedAt = null;
    this.setStatus('playing');
  }

  /**
   * Stop playback
   */
  stop(): void {
    if (this.status === 'idle' || this.status === 'stopped') {
      return;
    }

    this.logger.info('Stopping playback');

    // Clear timer
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }

    this.currentMedia = null;
    this.startTime = null;
    this.pausedAt = null;
    this.setStatus('stopped');
  }

  /**
   * Get current status
   */
  getStatus(): PlayerStatus {
    return this.status;
  }

  /**
   * Get current media
   */
  getCurrentMedia(): MediaPayload | null {
    return this.currentMedia;
  }

  /**
   * Check if player is alive
   */
  isAlive(): boolean {
    return this.status !== 'error';
  }

  /**
   * Set status and emit event
   */
  private setStatus(status: PlayerStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emit('statusChange', status);
    }
  }

  /**
   * Simulate media loading (for Node.js environment)
   */
  private async simulateLoad(media: MediaPayload): Promise<void> {
    // In production, this would initialize actual player
    // For now, simulate a short load time
    await new Promise(resolve => setTimeout(resolve, 100));

    // Validate media payload
    if (!media.url && !media.embedId) {
      throw new Error('Media must have url or embedId');
    }
  }

  /**
   * Schedule playback completion
   */
  private scheduleCompletion(durationMs: number): void {
    this.playbackTimer = setTimeout(() => {
      this.logger.info('Playback completed');
      this.setStatus('stopped');
      this.emit('playbackComplete');
    }, durationMs);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }
}

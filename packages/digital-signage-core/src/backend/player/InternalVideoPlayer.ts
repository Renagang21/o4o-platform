/**
 * InternalVideoPlayer
 *
 * Phase 5: Player for platform internal video content.
 *
 * Features:
 * - Platform-stored video files
 * - Direct URL or file path support
 * - Duration tracking
 *
 * Note: This is a server-side abstraction. Actual playback
 * occurs on the display device using HTML5 video element.
 */

import {
  BasePlayer,
  PlayerConfig,
  PlayerState,
} from './PlayerAdapter.js';

export class InternalVideoPlayer extends BasePlayer {
  private playbackTimer: ReturnType<typeof setInterval> | null = null;
  private startTime: number = 0;
  private elapsedTime: number = 0;

  constructor(config: PlayerConfig) {
    super(config);
  }

  /**
   * Get video source URL
   */
  getSourceUrl(): string {
    return this.config.sourceUrl;
  }

  /**
   * Get MIME type for video element
   */
  getMimeType(): string | null {
    return this.config.mimeType || null;
  }

  /**
   * Check if URL is valid
   */
  isValidSource(): boolean {
    const url = this.config.sourceUrl;
    if (!url) return false;

    // Check for common video file extensions or URL patterns
    const videoPatterns = [
      /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i,
      /^https?:\/\//,
      /^\/api\//,
      /^\/uploads\//,
    ];

    return videoPatterns.some((pattern) => pattern.test(url));
  }

  async play(): Promise<void> {
    if (!this.isValidSource()) {
      this.emitError(new Error('Invalid video source URL'));
      return;
    }

    if (this._state === PlayerState.PAUSED) {
      // Resume from paused
      this.startTime = Date.now();
      this.setState(PlayerState.PLAYING);
      this.startProgressTracking();
      return;
    }

    // Fresh start
    this.elapsedTime = 0;
    this.startTime = Date.now();
    this.setState(PlayerState.PLAYING);
    this.startProgressTracking();
  }

  async pause(): Promise<void> {
    if (this._state !== PlayerState.PLAYING) return;

    this.elapsedTime += Date.now() - this.startTime;
    this.stopProgressTracking();
    this.setState(PlayerState.PAUSED);
  }

  async stop(): Promise<void> {
    this.stopProgressTracking();
    this.elapsedTime = 0;
    this._progress = 0;
    this.setState(PlayerState.STOPPED);
  }

  private startProgressTracking(): void {
    this.stopProgressTracking();

    const duration = this.config.durationSeconds || 0;
    if (duration <= 0) return;

    this.playbackTimer = setInterval(() => {
      const totalElapsed = this.elapsedTime + (Date.now() - this.startTime);
      const progressPercent = Math.min(100, (totalElapsed / 1000 / duration) * 100);
      this.setProgress(progressPercent);

      if (progressPercent >= 100) {
        this.stopProgressTracking();
        this.setState(PlayerState.STOPPED);
        this.emitEnded();
      }
    }, 1000);
  }

  private stopProgressTracking(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  dispose(): void {
    this.stopProgressTracking();
    super.dispose();
  }
}

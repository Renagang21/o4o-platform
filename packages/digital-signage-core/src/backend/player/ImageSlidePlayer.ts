/**
 * ImageSlidePlayer
 *
 * Phase 5: Player for image slideshow content.
 *
 * Features:
 * - Single image display
 * - Duration-based display time
 * - Progress tracking
 *
 * Note: This is a server-side abstraction. Actual display
 * occurs on the display device using img element or CSS background.
 *
 * For multiple images, the RenderingEngine sequences through
 * MediaListItems, each with its own ImageSlidePlayer.
 */

import {
  BasePlayer,
  PlayerConfig,
  PlayerState,
} from './PlayerAdapter.js';

export class ImageSlidePlayer extends BasePlayer {
  private displayTimer: ReturnType<typeof setInterval> | null = null;
  private startTime: number = 0;
  private elapsedTime: number = 0;

  constructor(config: PlayerConfig) {
    super(config);
  }

  /**
   * Get image source URL
   */
  getSourceUrl(): string {
    return this.config.sourceUrl;
  }

  /**
   * Get display duration in seconds
   */
  getDuration(): number {
    return this.config.durationSeconds || 10; // Default 10 seconds
  }

  /**
   * Check if URL is valid image
   */
  isValidSource(): boolean {
    const url = this.config.sourceUrl;
    if (!url) return false;

    // Check for common image file extensions or URL patterns
    const imagePatterns = [
      /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i,
      /^https?:\/\//,
      /^data:image\//,
      /^\/api\//,
      /^\/uploads\//,
    ];

    return imagePatterns.some((pattern) => pattern.test(url));
  }

  async play(): Promise<void> {
    if (!this.isValidSource()) {
      this.emitError(new Error('Invalid image source URL'));
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

    const duration = this.getDuration();
    if (duration <= 0) return;

    this.displayTimer = setInterval(() => {
      const totalElapsed = this.elapsedTime + (Date.now() - this.startTime);
      const progressPercent = Math.min(100, (totalElapsed / 1000 / duration) * 100);
      this.setProgress(progressPercent);

      if (progressPercent >= 100) {
        this.stopProgressTracking();
        this.setState(PlayerState.STOPPED);
        this.emitEnded();
      }
    }, 100); // More frequent updates for smoother progress
  }

  private stopProgressTracking(): void {
    if (this.displayTimer) {
      clearInterval(this.displayTimer);
      this.displayTimer = null;
    }
  }

  dispose(): void {
    this.stopProgressTracking();
    super.dispose();
  }
}

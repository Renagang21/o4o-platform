/**
 * YouTubePlayer
 *
 * Phase 5: Player for YouTube video content.
 *
 * Features:
 * - Public URL support
 * - iframe-based playback (on client)
 * - Duration tracking
 *
 * Note: This is a server-side abstraction. Actual playback
 * occurs on the display device. This class manages state
 * and communicates with the device.
 */

import {
  BasePlayer,
  PlayerConfig,
  PlayerState,
  PlayerEventType,
} from './PlayerAdapter.js';

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

export class YouTubePlayer extends BasePlayer {
  private videoId: string | null;
  private playbackTimer: ReturnType<typeof setInterval> | null = null;
  private startTime: number = 0;
  private elapsedTime: number = 0;

  constructor(config: PlayerConfig) {
    super(config);
    this.videoId = extractYouTubeVideoId(config.sourceUrl);
  }

  /**
   * Get YouTube video ID
   */
  getVideoId(): string | null {
    return this.videoId;
  }

  /**
   * Get embed URL for iframe
   */
  getEmbedUrl(): string | null {
    if (!this.videoId) return null;
    return `https://www.youtube.com/embed/${this.videoId}?autoplay=1&enablejsapi=1`;
  }

  async play(): Promise<void> {
    if (!this.videoId) {
      this.emitError(new Error('Invalid YouTube URL'));
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

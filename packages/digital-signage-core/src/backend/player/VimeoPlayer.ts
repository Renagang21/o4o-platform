/**
 * VimeoPlayer
 *
 * Phase 5: Player for Vimeo video content.
 *
 * Features:
 * - Public and private URL support
 * - Hash token for private videos
 * - Duration tracking
 *
 * Note: This is a server-side abstraction. Actual playback
 * occurs on the display device.
 */

import {
  BasePlayer,
  PlayerConfig,
  PlayerState,
} from './PlayerAdapter.js';

/**
 * Extract Vimeo video ID and hash from URL
 */
function extractVimeoInfo(url: string): { videoId: string | null; hash: string | null } {
  const patterns = [
    // https://vimeo.com/123456789
    /vimeo\.com\/(\d+)/,
    // https://vimeo.com/123456789/abcdef1234
    /vimeo\.com\/(\d+)\/([a-zA-Z0-9]+)/,
    // https://player.vimeo.com/video/123456789
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        videoId: match[1],
        hash: match[2] || null,
      };
    }
  }
  return { videoId: null, hash: null };
}

export class VimeoPlayer extends BasePlayer {
  private videoId: string | null;
  private hash: string | null;
  private playbackTimer: ReturnType<typeof setInterval> | null = null;
  private startTime: number = 0;
  private elapsedTime: number = 0;

  constructor(config: PlayerConfig) {
    super(config);
    const info = extractVimeoInfo(config.sourceUrl);
    this.videoId = info.videoId;
    this.hash = info.hash;
  }

  /**
   * Get Vimeo video ID
   */
  getVideoId(): string | null {
    return this.videoId;
  }

  /**
   * Get private hash (if available)
   */
  getHash(): string | null {
    return this.hash;
  }

  /**
   * Get embed URL for iframe
   */
  getEmbedUrl(): string | null {
    if (!this.videoId) return null;

    let embedUrl = `https://player.vimeo.com/video/${this.videoId}?autoplay=1`;
    if (this.hash) {
      embedUrl += `&h=${this.hash}`;
    }
    return embedUrl;
  }

  async play(): Promise<void> {
    if (!this.videoId) {
      this.emitError(new Error('Invalid Vimeo URL'));
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

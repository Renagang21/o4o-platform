/**
 * PlayerFactory
 *
 * Phase 5: Factory for creating appropriate player instances
 * based on media source type.
 *
 * Responsibilities:
 * - Detect media type from source URL/type
 * - Create appropriate player instance
 *
 * Does NOT:
 * - Make business decisions
 * - Handle scheduling
 * - Interpret content meaning
 */

import { PlayerAdapter, PlayerConfig, MediaType } from './PlayerAdapter.js';
import { YouTubePlayer } from './YouTubePlayer.js';
import { VimeoPlayer } from './VimeoPlayer.js';
import { InternalVideoPlayer } from './InternalVideoPlayer.js';
import { ImageSlidePlayer } from './ImageSlidePlayer.js';

/**
 * Detect media type from source URL and type
 */
export function detectMediaType(sourceUrl: string, sourceType?: string, mimeType?: string): MediaType {
  const url = sourceUrl.toLowerCase();

  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return MediaType.YOUTUBE;
  }

  // Vimeo
  if (url.includes('vimeo.com')) {
    return MediaType.VIMEO;
  }

  // Image types
  if (mimeType?.startsWith('image/')) {
    return MediaType.IMAGE_SLIDE;
  }
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url)) {
    return MediaType.IMAGE_SLIDE;
  }

  // Video types
  if (mimeType?.startsWith('video/')) {
    return MediaType.INTERNAL_VIDEO;
  }
  if (/\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(url)) {
    return MediaType.INTERNAL_VIDEO;
  }

  // Check sourceType hint
  if (sourceType) {
    const type = sourceType.toLowerCase();
    if (type === 'youtube') return MediaType.YOUTUBE;
    if (type === 'vimeo') return MediaType.VIMEO;
    if (type === 'video' || type === 'internal_video') return MediaType.INTERNAL_VIDEO;
    if (type === 'image' || type === 'image_slide') return MediaType.IMAGE_SLIDE;
  }

  return MediaType.UNKNOWN;
}

/**
 * Create a player instance for the given configuration
 */
export function createPlayer(config: PlayerConfig): PlayerAdapter | null {
  const mediaType = detectMediaType(
    config.sourceUrl,
    config.sourceType,
    config.mimeType
  );

  switch (mediaType) {
    case MediaType.YOUTUBE:
      return new YouTubePlayer(config);

    case MediaType.VIMEO:
      return new VimeoPlayer(config);

    case MediaType.INTERNAL_VIDEO:
      return new InternalVideoPlayer(config);

    case MediaType.IMAGE_SLIDE:
      return new ImageSlidePlayer(config);

    case MediaType.UNKNOWN:
    default:
      // For unknown types, try internal video player as fallback
      // It will fail gracefully if source is invalid
      return new InternalVideoPlayer(config);
  }
}

/**
 * PlayerFactory class (alternative to functions)
 */
export class PlayerFactory {
  /**
   * Detect media type from source configuration
   */
  static detectType(sourceUrl: string, sourceType?: string, mimeType?: string): MediaType {
    return detectMediaType(sourceUrl, sourceType, mimeType);
  }

  /**
   * Create a player for the given configuration
   */
  static create(config: PlayerConfig): PlayerAdapter | null {
    return createPlayer(config);
  }

  /**
   * Check if a media type is supported
   */
  static isSupported(mediaType: MediaType): boolean {
    return [
      MediaType.YOUTUBE,
      MediaType.VIMEO,
      MediaType.INTERNAL_VIDEO,
      MediaType.IMAGE_SLIDE,
    ].includes(mediaType);
  }

  /**
   * Get list of supported media types
   */
  static getSupportedTypes(): MediaType[] {
    return [
      MediaType.YOUTUBE,
      MediaType.VIMEO,
      MediaType.INTERNAL_VIDEO,
      MediaType.IMAGE_SLIDE,
    ];
  }
}

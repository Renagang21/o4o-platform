/**
 * Player Module Exports
 *
 * Phase 5: Export all player-related types and classes.
 */

// Core classes and enums (values)
export {
  BasePlayer,
  PlayerState,
  MediaType,
  PlayerEventType,
} from './PlayerAdapter.js';

// Core interfaces (types only)
export type {
  PlayerAdapter,
  PlayerEvent,
  PlayerEventListener,
  PlayerConfig,
} from './PlayerAdapter.js';

// Player implementations
export { YouTubePlayer } from './YouTubePlayer.js';
export { VimeoPlayer } from './VimeoPlayer.js';
export { InternalVideoPlayer } from './InternalVideoPlayer.js';
export { ImageSlidePlayer } from './ImageSlidePlayer.js';

// Factory
export { PlayerFactory, createPlayer, detectMediaType } from './PlayerFactory.js';

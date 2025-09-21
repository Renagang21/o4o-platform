/**
 * Shared Components for Editor Blocks
 * Cover Block과 Gallery Block에서 공용으로 사용하는 컴포넌트들
 */

// Main Components
export { default as MediaSelector } from './MediaSelector';
export { default as CompactMediaSelector } from './CompactMediaSelector';
export { default as InlineMediaBrowser } from './InlineMediaBrowser';
export {
  LayoutGrid,
  getPositionClassName,
  generateGridStyles,
  getAspectRatioValue,
  useResponsiveLayoutGrid
} from './LayoutGrid';
export {
  BlockTransforms,
  canTransformBlock,
  transformImageToCover,
  transformImageToGallery,
  transformCoverToImage,
  transformCoverToGallery,
  transformGalleryToImage,
  transformGalleryToCover
} from './BlockTransforms';

// Example Components
export { default as EnhancedCoverBlock } from './examples/EnhancedCoverBlock';
export { default as EnhancedGalleryBlock } from './examples/EnhancedGalleryBlock';

// Hooks
export { useMediaSelector } from './hooks/useMediaSelector';

// Types
export type {
  MediaItem,
  MediaSelectorProps,
  MediaSelectorConfig,
  MediaUploadProgress,
  MediaFilters,
  MediaSelectorState,
  ViewMode,
  FilterType,
  MediaType,
  UseMediaSelectorReturn,
  CompactMediaSelectorProps,
  InlineMediaBrowserProps
} from './types';

export type {
  CoverPosition,
  GalleryLayout,
  LayoutGridProps
} from './LayoutGrid';

// Utilities
export {
  transformMediaFile,
  transformToMediaFile,
  formatFileSize,
  isImageFile,
  isVideoFile,
  isSupportedFileType,
  getMediaTypeFromFile,
  filterUploadableFiles,
  generateImageThumbnail,
  generateVideoThumbnail,
  downloadMediaItem,
  extractImageMetadata,
  sortMediaItems,
  filterMediaItems,
  createMediaCollection,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES
} from './utils/mediaUtils';
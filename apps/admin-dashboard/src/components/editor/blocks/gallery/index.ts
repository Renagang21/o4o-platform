/**
 * Enhanced Gallery Block - Export Index
 * WordPress Gutenberg와 85% 유사도를 목표로 하는 갤러리 블록의 모든 컴포넌트와 유틸리티 내보내기
 */

// Main Gallery Block Component
export { default as EnhancedGalleryBlock } from '../EnhancedGalleryBlock';

// Layout Components
export { default as GalleryGrid } from './GalleryGrid';
export { default as GalleryMasonry } from './GalleryMasonry';
export { default as GallerySlider } from './GallerySlider';

// UI Components
export { default as GalleryItem } from './GalleryItem';
export { default as GalleryLightbox } from './GalleryLightbox';
export { default as GallerySettings } from './GallerySettings';

// Accessibility Components
export {
  default as GalleryAccessibility,
  useImageAccessibility,
  useGalleryKeyboardNavigation,
  useScreenReaderSupport,
  useHighContrastMode,
  useReducedMotion,
  useFocusTrap
} from './GalleryAccessibility';

// Types and Interfaces
export type {
  GalleryImage,
  GalleryAttributes,
  EnhancedGalleryBlockProps,
  GalleryLayoutConfig,
  GalleryItemProps,
  GalleryLightboxProps,
  GallerySettingsProps,
  GalleryEvents,
  GalleryError,
  GalleryLayoutType,
  GalleryCaptionPosition,
  GalleryAspectRatio,
  GalleryHoverEffect,
  GalleryImageFilter,
  GalleryImageAction,
  WordPressGalleryShortcode
} from './types';

// Constants
export {
  DEFAULT_GALLERY_ATTRIBUTES,
  LAYOUT_CONFIGS,
  ASPECT_RATIOS,
  HOVER_EFFECTS,
  IMAGE_FILTERS
} from './types';

// Utilities
export {
  parseWordPressGalleryShortcode,
  generateWordPressGalleryShortcode,
  generateGalleryClasses,
  generateGalleryStyles,
  generateImageStyles,
  getResponsiveColumns,
  distributeImagesAcrossColumns,
  generateAccessibilityProps,
  generateImageLoadingProps,
  calculateVirtualization,
  extractImageMetadata,
  colorUtils,
  debounce,
  throttle
} from './utils';

// Re-export shared components that might be used with Gallery
export { default as MediaSelector } from '../shared/MediaSelector';
export type { MediaItem } from '../shared/MediaSelector';

/**
 * Gallery Block Configuration for WordPress Gutenberg compatibility
 */
export const GALLERY_BLOCK_CONFIG = {
  name: 'enhanced-gallery',
  title: 'Enhanced Gallery',
  category: 'media',
  icon: 'format-gallery',
  description: 'Display multiple images in a rich gallery with various layouts.',
  keywords: ['gallery', 'images', 'photos', 'grid', 'masonry', 'carousel', 'slider'],
  supports: {
    align: ['left', 'center', 'right', 'wide', 'full'],
    anchor: true,
    className: true,
    color: {
      background: true,
      text: true,
      link: true
    },
    spacing: {
      margin: true,
      padding: true
    },
    border: {
      color: true,
      radius: true,
      style: true,
      width: true
    }
  },
  attributes: {
    images: {
      type: 'array',
      default: [],
      source: 'query',
      selector: '.gallery-item',
      query: {
        id: { type: 'string', source: 'attribute', attribute: 'data-id' },
        url: { type: 'string', source: 'attribute', selector: 'img', attribute: 'src' },
        fullUrl: { type: 'string', source: 'attribute', selector: 'img', attribute: 'data-full-url' },
        alt: { type: 'string', source: 'attribute', selector: 'img', attribute: 'alt' },
        caption: { type: 'string', source: 'html', selector: '.gallery-caption' },
        title: { type: 'string', source: 'attribute', selector: 'img', attribute: 'title' }
      }
    },
    ids: {
      type: 'array',
      default: []
    },
    layout: {
      type: 'string',
      default: 'grid',
      enum: ['grid', 'masonry', 'slider']
    },
    columns: {
      type: 'number',
      default: 3,
      minimum: 1,
      maximum: 8
    },
    gap: {
      type: 'number',
      default: 16,
      minimum: 0,
      maximum: 50
    },
    aspectRatio: {
      type: 'string',
      default: 'auto',
      enum: ['auto', 'square', '16:9', '4:3', '3:2']
    },
    imageCrop: {
      type: 'boolean',
      default: false
    },
    showCaptions: {
      type: 'boolean',
      default: true
    },
    captionPosition: {
      type: 'string',
      default: 'below',
      enum: ['below', 'overlay', 'hover']
    },
    enableLightbox: {
      type: 'boolean',
      default: true
    },
    lightboxAnimation: {
      type: 'string',
      default: 'fade',
      enum: ['fade', 'slide', 'zoom']
    },
    linkTo: {
      type: 'string',
      default: 'none',
      enum: ['none', 'media', 'attachment']
    },
    randomOrder: {
      type: 'boolean',
      default: false
    },
    hoverEffect: {
      type: 'string',
      default: 'none',
      enum: ['none', 'zoom', 'fade', 'lift']
    },
    imageFilter: {
      type: 'string',
      default: 'none',
      enum: ['none', 'grayscale', 'sepia', 'blur']
    },
    borderRadius: {
      type: 'number',
      default: 0,
      minimum: 0,
      maximum: 30
    },
    borderWidth: {
      type: 'number',
      default: 0,
      minimum: 0,
      maximum: 10
    },
    borderColor: {
      type: 'string',
      default: '#e5e7eb'
    },
    padding: {
      type: 'number',
      default: 0,
      minimum: 0,
      maximum: 50
    },
    align: {
      type: 'string',
      enum: ['left', 'center', 'right', 'wide', 'full']
    },
    className: {
      type: 'string'
    },
    anchor: {
      type: 'string'
    }
  },
  transforms: {
    from: [
      {
        type: 'shortcode',
        tag: 'gallery',
        transform: (attrs: any) => {
          return {
            images: [],
            ids: attrs.ids ? attrs.ids.split(',') : [],
            columns: attrs.columns ? parseInt(attrs.columns) : 3,
            linkTo: attrs.link === 'file' ? 'media' : attrs.link === 'post' ? 'attachment' : 'none',
            randomOrder: attrs.orderby === 'rand'
          };
        }
      }
    ],
    to: [
      {
        type: 'shortcode',
        tag: 'gallery',
        transform: (attributes: any) => {
          const { ids, columns, linkTo, randomOrder } = attributes;
          const attrs: any = {};

          if (ids && ids.length > 0) {
            attrs.ids = ids.join(',');
          }
          if (columns !== 3) {
            attrs.columns = columns;
          }
          if (linkTo === 'media') {
            attrs.link = 'file';
          } else if (linkTo === 'attachment') {
            attrs.link = 'post';
          }
          if (randomOrder) {
            attrs.orderby = 'rand';
          }

          return attrs;
        }
      }
    ]
  }
};

/**
 * CSS Classes for WordPress Gutenberg compatibility
 */
export const GALLERY_CSS_CLASSES = {
  // Main container classes
  gallery: 'wp-block-gallery',
  galleryGrid: 'is-layout-grid',
  galleryMasonry: 'is-layout-masonry',
  gallerySlider: 'is-layout-slider',

  // Column classes
  columns: (count: number) => `has-${count}-columns`,

  // State classes
  cropped: 'is-cropped',
  fixed: 'has-fixed-layout',

  // Item classes
  item: 'wp-block-gallery__item',
  image: 'wp-block-gallery__image',
  caption: 'wp-block-gallery__caption',

  // Alignment classes
  alignLeft: 'alignleft',
  alignCenter: 'aligncenter',
  alignRight: 'alignright',
  alignWide: 'alignwide',
  alignFull: 'alignfull'
};

/**
 * Default WordPress Gutenberg Gallery Block Settings
 */
export const GUTENBERG_DEFAULTS = {
  columns: 3,
  gap: 16,
  aspectRatio: 'auto',
  imageCrop: false,
  linkTo: 'none',
  showCaptions: true,
  captionPosition: 'below',
  enableLightbox: true
};

/**
 * WordPress Media API compatibility functions
 */
export const WP_MEDIA_API = {
  // Convert WordPress attachment to GalleryImage
  attachmentToGalleryImage: (attachment: any): GalleryImage => ({
    id: attachment.id.toString(),
    url: attachment.url,
    fullUrl: attachment.sizes?.full?.url || attachment.url,
    thumbnailUrl: attachment.sizes?.thumbnail?.url || attachment.url,
    alt: attachment.alt,
    caption: attachment.caption?.rendered || attachment.caption,
    title: attachment.title?.rendered || attachment.title,
    width: attachment.media_details?.width || 0,
    height: attachment.media_details?.height || 0,
    fileSize: attachment.media_details?.filesize,
    mimeType: attachment.mime_type
  }),

  // Convert GalleryImage to WordPress attachment format
  galleryImageToAttachment: (image: GalleryImage) => ({
    id: parseInt(image.id),
    url: image.url,
    alt: image.alt,
    caption: image.caption,
    title: image.title,
    sizes: {
      full: { url: image.fullUrl || image.url },
      thumbnail: { url: image.thumbnailUrl || image.url }
    },
    media_details: {
      width: image.width,
      height: image.height,
      filesize: image.fileSize
    },
    mime_type: image.mimeType
  })
};

/**
 * Performance optimization constants
 */
export const PERFORMANCE_CONFIG = {
  // Lazy loading threshold
  LAZY_LOAD_THRESHOLD: 6,

  // Virtual scrolling settings
  VIRTUAL_ITEM_HEIGHT: 300,
  VIRTUAL_OVERSCAN: 5,

  // Image optimization
  THUMBNAIL_SIZE: 300,
  PREVIEW_SIZE: 800,

  // Animation performance
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100
};

/**
 * Accessibility constants
 */
export const A11Y_CONFIG = {
  // ARIA labels
  GALLERY_LABEL: 'Image gallery',
  IMAGE_LABEL: (index: number, total: number) => `Image ${index + 1} of ${total}`,

  // Keyboard shortcuts
  KEYBOARD_SHORTCUTS: {
    ARROW_LEFT: 'Previous image',
    ARROW_RIGHT: 'Next image',
    ARROW_UP: 'Previous row',
    ARROW_DOWN: 'Next row',
    ENTER: 'Open image',
    SPACE: 'Open image',
    HOME: 'First image',
    END: 'Last image',
    ESCAPE: 'Close'
  },

  // Focus management
  FOCUS_DELAY: 100,
  ANNOUNCEMENT_DELAY: 1000
};
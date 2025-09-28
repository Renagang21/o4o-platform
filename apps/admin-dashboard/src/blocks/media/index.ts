/**
 * Media Blocks - For multimedia content
 * Lazy loaded when needed
 */

import { registerSlideBlock } from './slide-block';

// Register media WordPress blocks
export function registerMediaBlocks() {
  if (!window.wp?.blocks?.registerBlockType) {
    // WordPress blocks API not available
    return;
  }

  // Register gallery block
  window.wp.blocks.registerBlockType('core/gallery', {
    title: 'Gallery',
    description: 'Display multiple images in a rich gallery.',
    category: 'media',
    icon: 'format-gallery',
    keywords: ['images', 'photos'],
    supports: {
      anchor: true,
      align: ['left', 'center', 'right', 'wide', 'full'],
    },
    attributes: {
      images: {
        type: 'array',
        default: [],
        source: 'query',
        selector: '.blocks-gallery-item',
        query: {
          url: {
            type: 'string',
            source: 'attribute',
            selector: 'img',
            attribute: 'src',
          },
          fullUrl: {
            type: 'string',
            source: 'attribute',
            selector: 'img',
            attribute: 'data-full-url',
          },
          link: {
            type: 'string',
            source: 'attribute',
            selector: 'img',
            attribute: 'data-link',
          },
          alt: {
            type: 'string',
            source: 'attribute',
            selector: 'img',
            attribute: 'alt',
            default: '',
          },
          id: {
            type: 'string',
            source: 'attribute',
            selector: 'img',
            attribute: 'data-id',
          },
          caption: {
            type: 'string',
            source: 'html',
            selector: '.blocks-gallery-item__caption',
          },
        },
      },
      columns: {
        type: 'number',
        default: 3,
      },
      caption: {
        type: 'string',
        source: 'html',
        selector: '.blocks-gallery-caption',
      },
      imageCrop: {
        type: 'boolean',
        default: true,
      },
      linkTo: {
        type: 'string',
      },
    },
    edit: () => null,
    save: () => null,
  });

  // Register audio block
  window.wp.blocks.registerBlockType('core/audio', {
    title: 'Audio',
    description: 'Embed a simple audio player.',
    category: 'media',
    icon: 'format-audio',
    keywords: ['music', 'sound', 'podcast'],
    supports: {
      anchor: true,
      align: ['left', 'center', 'right', 'wide', 'full'],
    },
    attributes: {
      src: {
        type: 'string',
      },
      caption: {
        type: 'string',
        source: 'html',
        selector: 'figcaption',
      },
      id: {
        type: 'number',
      },
      autoplay: {
        type: 'boolean',
      },
      loop: {
        type: 'boolean',
      },
      preload: {
        type: 'string',
      },
    },
    edit: () => null,
    save: () => null,
  });

  // Register video block
  window.wp.blocks.registerBlockType('core/video', {
    title: 'Video',
    description: 'Embed a video.',
    category: 'media',
    icon: 'format-video',
    keywords: ['movie', 'film'],
    supports: {
      anchor: true,
      align: ['left', 'center', 'right', 'wide', 'full'],
    },
    attributes: {
      autoplay: {
        type: 'boolean',
      },
      caption: {
        type: 'string',
        source: 'html',
        selector: 'figcaption',
      },
      controls: {
        type: 'boolean',
        default: true,
      },
      id: {
        type: 'number',
      },
      loop: {
        type: 'boolean',
      },
      muted: {
        type: 'boolean',
      },
      poster: {
        type: 'string',
      },
      preload: {
        type: 'string',
        default: 'metadata',
      },
      src: {
        type: 'string',
      },
      playsInline: {
        type: 'boolean',
      },
    },
    edit: () => null,
    save: () => null,
  });

  // Register file block
  window.wp.blocks.registerBlockType('core/file', {
    title: 'File',
    description: 'Add a link to a downloadable file.',
    category: 'media',
    icon: 'media-default',
    keywords: ['document', 'pdf', 'download'],
    supports: {
      anchor: true,
      align: true,
    },
    attributes: {
      id: {
        type: 'number',
      },
      href: {
        type: 'string',
      },
      fileName: {
        type: 'string',
      },
      textLinkHref: {
        type: 'string',
      },
      textLinkTarget: {
        type: 'string',
      },
      showDownloadButton: {
        type: 'boolean',
        default: true,
      },
      downloadButtonText: {
        type: 'string',
      },
      displayPreview: {
        type: 'boolean',
      },
      previewHeight: {
        type: 'number',
        default: 600,
      },
    },
    edit: () => null,
    save: () => null,
  });

  // Register media & text block
  window.wp.blocks.registerBlockType('core/media-text', {
    title: 'Media & Text',
    description: 'Set media and words side-by-side.',
    category: 'media',
    icon: 'align-left',
    keywords: ['image', 'video', 'half'],
    supports: {
      anchor: true,
      align: ['wide', 'full'],
      html: false,
      color: {
        gradients: true,
        link: true,
      },
    },
    attributes: {
      align: {
        type: 'string',
        default: 'wide',
      },
      mediaAlt: {
        type: 'string',
      },
      mediaPosition: {
        type: 'string',
        default: 'left',
      },
      mediaId: {
        type: 'number',
      },
      mediaUrl: {
        type: 'string',
      },
      mediaLink: {
        type: 'string',
      },
      linkDestination: {
        type: 'string',
      },
      linkTarget: {
        type: 'string',
      },
      href: {
        type: 'string',
      },
      rel: {
        type: 'string',
      },
      linkClass: {
        type: 'string',
      },
      mediaType: {
        type: 'string',
      },
      mediaWidth: {
        type: 'number',
        default: 50,
      },
      mediaSizeSlug: {
        type: 'string',
      },
      isStackedOnMobile: {
        type: 'boolean',
        default: true,
      },
      verticalAlignment: {
        type: 'string',
      },
      imageFill: {
        type: 'boolean',
      },
      focalPoint: {
        type: 'object',
      },
    },
    edit: () => null,
    save: () => null,
  });

  // Register slide presentation block
  registerSlideBlock();
}

export default registerMediaBlocks;
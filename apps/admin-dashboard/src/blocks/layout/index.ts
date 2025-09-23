/**
 * Layout Blocks - For page structure and layout
 * Loaded on demand
 */

// Register layout WordPress blocks
export function registerLayoutBlocks() {
  if (!window.wp?.blocks?.registerBlockType) {
    // WordPress blocks API not available
    return;
  }

  // Register columns block
  window.wp.blocks.registerBlockType('core/columns', {
    title: 'Columns',
    description: 'Display content in multiple columns.',
    category: 'design',
    icon: 'columns',
    keywords: ['layout', 'column', 'section'],
    supports: {
      align: ['wide', 'full'],
      anchor: true,
      html: false,
    },
    attributes: {
      verticalAlignment: {
        type: 'string',
      },
      isStackedOnMobile: {
        type: 'boolean',
        default: true,
      },
    },
    edit: () => null,
    save: () => null,
  });

  // Register column block
  window.wp.blocks.registerBlockType('core/column', {
    title: 'Column',
    parent: ['core/columns'],
    description: 'A single column within a columns block.',
    category: 'design',
    icon: 'column',
    supports: {
      anchor: true,
      reusable: false,
      html: false,
    },
    attributes: {
      verticalAlignment: {
        type: 'string',
      },
      width: {
        type: 'string',
      },
    },
    edit: () => null,
    save: () => null,
  });

  // Register group block
  window.wp.blocks.registerBlockType('core/group', {
    title: 'Group',
    description: 'Group blocks together.',
    category: 'design',
    icon: 'block-default',
    keywords: ['container', 'wrapper', 'row', 'section'],
    supports: {
      align: ['wide', 'full'],
      anchor: true,
      html: false,
      color: {
        gradients: true,
        link: true,
      },
      spacing: {
        padding: true,
        margin: ['top', 'bottom'],
      },
    },
    attributes: {
      tagName: {
        type: 'string',
        default: 'div',
      },
      templateLock: {
        type: 'string',
      },
    },
    edit: () => null,
    save: () => null,
  });

  // Register separator block
  window.wp.blocks.registerBlockType('core/separator', {
    title: 'Separator',
    description: 'Create a break between ideas or sections.',
    category: 'design',
    icon: 'minus',
    keywords: ['horizontal-line', 'hr', 'divider'],
    supports: {
      anchor: true,
      align: ['center', 'wide', 'full'],
    },
    attributes: {
      color: {
        type: 'string',
      },
      customColor: {
        type: 'string',
      },
    },
    edit: () => null,
    save: () => null,
  });

  // Register spacer block
  window.wp.blocks.registerBlockType('core/spacer', {
    title: 'Spacer',
    description: 'Add white space between blocks.',
    category: 'design',
    icon: 'image-flip-vertical',
    keywords: ['space', 'gap'],
    supports: {
      anchor: true,
    },
    attributes: {
      height: {
        type: 'number',
        default: 100,
      },
      width: {
        type: 'number',
      },
    },
    edit: () => null,
    save: () => null,
  });

  // Register cover block
  window.wp.blocks.registerBlockType('core/cover', {
    title: 'Cover',
    description: 'Add an image or video with a text overlay.',
    category: 'media',
    icon: 'cover-image',
    keywords: ['background', 'hero'],
    supports: {
      align: ['left', 'center', 'right', 'wide', 'full'],
      anchor: true,
      html: false,
      spacing: {
        padding: true,
      },
      color: {
        __experimentalDuotone: '> .wp-block-cover__image-background, > .wp-block-cover__video-background',
        text: false,
        background: false,
      },
    },
    attributes: {
      url: {
        type: 'string',
      },
      id: {
        type: 'number',
      },
      alt: {
        type: 'string',
        default: '',
      },
      hasParallax: {
        type: 'boolean',
        default: false,
      },
      isRepeated: {
        type: 'boolean',
        default: false,
      },
      dimRatio: {
        type: 'number',
        default: 50,
      },
      overlayColor: {
        type: 'string',
      },
      customOverlayColor: {
        type: 'string',
      },
      backgroundType: {
        type: 'string',
        default: 'image',
      },
      focalPoint: {
        type: 'object',
      },
    },
    edit: () => null,
    save: () => null,
  });
}

export default registerLayoutBlocks;
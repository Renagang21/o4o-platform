/**
 * Core Blocks - Essential blocks for basic editing
 * These are loaded immediately
 */

// Register core WordPress blocks
export function registerCoreBlocks() {
  if (!window.wp?.blocks?.registerBlockType) {
    console.warn('WordPress blocks API not available');
    return;
  }

  // Register core paragraph block
  window.wp.blocks.registerBlockType('core/paragraph', {
    title: 'Paragraph',
    description: 'Start with the basic building block of all narrative.',
    category: 'text',
    icon: 'editor-paragraph',
    keywords: ['text', 'paragraph'],
    supports: {
      className: true,
      anchor: true,
    },
    attributes: {
      content: {
        type: 'string',
        source: 'html',
        selector: 'p',
      },
      align: {
        type: 'string',
      },
    },
    edit: () => null,
    save: () => null,
  });

  // Register heading block
  window.wp.blocks.registerBlockType('core/heading', {
    title: 'Heading',
    description: 'Introduce new sections and organize content.',
    category: 'text',
    icon: 'heading',
    keywords: ['title', 'subtitle'],
    supports: {
      className: true,
      anchor: true,
    },
    attributes: {
      content: {
        type: 'string',
        source: 'html',
        selector: 'h1,h2,h3,h4,h5,h6',
      },
      level: {
        type: 'number',
        default: 2,
      },
      align: {
        type: 'string',
      },
    },
    edit: () => null,
    save: () => null,
  });

  // Register list block
  window.wp.blocks.registerBlockType('core/list', {
    title: 'List',
    description: 'Create ordered or unordered lists.',
    category: 'text',
    icon: 'editor-ul',
    keywords: ['bullet', 'number', 'ordered', 'unordered'],
    supports: {
      className: true,
    },
    attributes: {
      ordered: {
        type: 'boolean',
        default: false,
      },
      values: {
        type: 'string',
        source: 'html',
        selector: 'ol,ul',
      },
    },
    edit: () => null,
    save: () => null,
  });

  // Register quote block
  window.wp.blocks.registerBlockType('core/quote', {
    title: 'Quote',
    description: 'Give quoted text visual emphasis.',
    category: 'text',
    icon: 'editor-quote',
    keywords: ['blockquote', 'cite'],
    supports: {
      anchor: true,
    },
    attributes: {
      value: {
        type: 'string',
        source: 'html',
        selector: 'blockquote',
      },
      citation: {
        type: 'string',
        source: 'html',
        selector: 'cite',
      },
    },
    edit: () => null,
    save: () => null,
  });

  // Register code block
  window.wp.blocks.registerBlockType('core/code', {
    title: 'Code',
    description: 'Display code snippets.',
    category: 'text',
    icon: 'editor-code',
    keywords: ['code', 'preformatted'],
    supports: {
      anchor: true,
    },
    attributes: {
      content: {
        type: 'string',
        source: 'html',
        selector: 'code',
      },
    },
    edit: () => null,
    save: () => null,
  });

  // Register image block
  window.wp.blocks.registerBlockType('core/image', {
    title: 'Image',
    description: 'Insert an image.',
    category: 'media',
    icon: 'format-image',
    keywords: ['img', 'photo', 'picture'],
    supports: {
      anchor: true,
      align: ['left', 'center', 'right', 'wide', 'full'],
    },
    attributes: {
      url: {
        type: 'string',
      },
      alt: {
        type: 'string',
      },
      caption: {
        type: 'string',
      },
      width: {
        type: 'number',
      },
      height: {
        type: 'number',
      },
    },
    edit: () => null,
    save: () => null,
  });
}

export default registerCoreBlocks;
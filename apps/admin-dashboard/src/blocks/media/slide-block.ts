/**
 * SlideBlock Registration for WordPress Block Editor
 */

import { SlideBlock } from '@/components/editor/blocks/slide';

export function registerSlideBlock() {
  if (!window.wp?.blocks?.registerBlockType) {
    return;
  }

  window.wp.blocks.registerBlockType('o4o/slide', {
    title: 'Slide Presentation',
    description: 'Create interactive slide presentations with text, images, and mixed content.',
    category: 'media',
    icon: 'slides',
    keywords: ['slide', 'presentation', 'carousel', 'slideshow'],
    supports: {
      className: true,
      anchor: true,
      align: ['wide', 'full']
    },
    attributes: {
      slides: {
        type: 'array',
        default: []
      },
      aspectRatio: {
        type: 'string',
        default: '16:9'
      },
      transition: {
        type: 'string',
        default: 'fade'
      },
      autoPlay: {
        type: 'boolean',
        default: false
      },
      autoPlayInterval: {
        type: 'number',
        default: 5000
      },
      showNavigation: {
        type: 'boolean',
        default: true
      },
      showPagination: {
        type: 'boolean',
        default: true
      },
      backgroundColor: {
        type: 'string',
        default: '#f0f0f0'
      }
    },
    edit: SlideBlock,
    save: () => null
  });
}
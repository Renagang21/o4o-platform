/**
 * Gallery Block Definition
 */

import React from 'react';
import { Images } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import EnhancedGalleryBlock from '@/components/editor/blocks/EnhancedGalleryBlock';

export const galleryBlockDefinition: BlockDefinition = {
  name: 'core/gallery',
  title: 'Gallery',
  category: 'media',
  icon: <Images className="w-5 h-5" />,
  description: 'Display multiple images in a rich gallery.',
  keywords: ['photos', 'images', 'album', 'pictures'],
  component: EnhancedGalleryBlock,
  attributes: {
    images: {
      type: 'array',
      default: [],
    },
    layout: {
      type: 'string',
      default: 'grid',
    },
    columns: {
      type: 'number',
      default: 3,
    },
    gap: {
      type: 'number',
      default: 16,
    },
    aspectRatio: {
      type: 'string',
      default: '1:1',
    },
    showCaptions: {
      type: 'boolean',
      default: false,
    },
    captionPosition: {
      type: 'string',
      default: 'below',
    },
    enableLightbox: {
      type: 'boolean',
      default: true,
    },
    lightboxAnimation: {
      type: 'string',
      default: 'fade',
    },
    randomOrder: {
      type: 'boolean',
      default: false,
    },
    hoverEffect: {
      type: 'string',
      default: 'none',
    },
    borderRadius: {
      type: 'number',
      default: 0,
    },
    imageCrop: {
      type: 'boolean',
      default: true,
    },
    linkTo: {
      type: 'string',
      default: 'none',
    },
  },
  supports: {
    align: ['left', 'center', 'right', 'wide', 'full'],
    anchor: true,
    className: true,
    spacing: {
      margin: true,
      padding: true,
    },
  },
};

export default galleryBlockDefinition;

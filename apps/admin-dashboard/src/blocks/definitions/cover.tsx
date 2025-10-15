/**
 * Cover Block Definition
 */

import React from 'react';
import { Layers } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import EnhancedCoverBlock from '@/components/editor/blocks/EnhancedCoverBlock';
import { BlockComponent } from '../registry/types';

export const coverBlockDefinition: BlockDefinition = {
  name: 'o4o/cover',
  title: 'Cover',
  category: 'media',
  icon: <Layers className="w-5 h-5" />,
  description: 'Add an image or video with a text overlay.',
  keywords: ['header', 'hero', 'banner', 'background'],
  component: EnhancedCoverBlock as unknown as BlockComponent,
  attributes: {
    backgroundType: {
      type: 'string',
      default: 'image',
    },
    backgroundImage: {
      type: 'object',
    },
    backgroundVideo: {
      type: 'object',
    },
    overlayColor: {
      type: 'string',
      default: 'rgba(0, 0, 0, 0.5)',
    },
    overlayOpacity: {
      type: 'number',
      default: 50,
    },
    minHeight: {
      type: 'number',
      default: 400,
    },
    contentPosition: {
      type: 'string',
      default: 'center',
    },
    focalPoint: {
      type: 'object',
      default: { x: 0.5, y: 0.5 },
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
    gradient: {
      type: 'object',
    },
    customGradient: {
      type: 'string',
    },
    backgroundSize: {
      type: 'string',
      default: 'cover',
    },
    backgroundPosition: {
      type: 'string',
      default: 'center',
    },
    backgroundRepeat: {
      type: 'string',
      default: 'no-repeat',
    },
    tagName: {
      type: 'string',
      default: 'div',
    },
    aspectRatio: {
      type: 'string',
      default: 'auto',
    },
    allowedBlocks: {
      type: 'array',
    },
    templateLock: {
      type: 'string',
    },
    useFeaturedImage: {
      type: 'boolean',
      default: false,
    },
    isUserOverlayColor: {
      type: 'boolean',
      default: false,
    },
  },
  supports: {
    align: ['left', 'center', 'right', 'wide', 'full'],
    anchor: true,
    className: true,
    color: {
      background: true,
      text: true,
    },
    spacing: {
      padding: true,
      margin: true,
    },
  },
};

export default coverBlockDefinition;

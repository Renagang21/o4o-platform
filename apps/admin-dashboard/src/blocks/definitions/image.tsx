/**
 * Image Block Definition
 */

import React from 'react';
import { Image } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import EnhancedImageBlock from '@/components/editor/blocks/EnhancedImageBlock';
import { BlockComponent } from '../registry/types';

export const imageBlockDefinition: BlockDefinition = {
  name: 'core/image',
  title: 'Image',
  category: 'media',
  icon: <Image className="w-5 h-5" />,
  description: 'Insert an image to make a visual statement.',
  keywords: ['photo', 'picture', 'media', 'img'],
  component: EnhancedImageBlock as unknown as BlockComponent,
  attributes: {
    url: {
      type: 'string',
      default: '',
    },
    alt: {
      type: 'string',
      default: '',
    },
    caption: {
      type: 'string',
      default: '',
    },
    align: {
      type: 'string',
      default: 'left',
    },
    size: {
      type: 'string',
      default: 'large',
    },
    linkTo: {
      type: 'string',
      default: 'none',
    },
    linkUrl: {
      type: 'string',
      default: '',
    },
    width: {
      type: 'number',
    },
    height: {
      type: 'number',
    },
    mediaId: {
      type: 'string',
    },
    dynamicSource: {
      type: 'object',
      default: {},
    },
    useDynamicSource: {
      type: 'boolean',
      default: false,
    },
  },
  supports: {
    align: ['left', 'center', 'right', 'wide', 'full'],
    anchor: true,
    className: true,
  },
};

export default imageBlockDefinition;

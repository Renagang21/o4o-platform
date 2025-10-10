/**
 * YouTube Block Definition
 */

import React from 'react';
import { Youtube } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import StandardYouTubeBlock from '@/components/editor/blocks/embed/StandardYouTubeBlock';
import { BlockComponent } from '../registry/types';

export const youtubeBlockDefinition: BlockDefinition = {
  name: 'o4o/youtube',
  title: 'YouTube',
  category: 'media',
  icon: <Youtube className="w-5 h-5" />,
  description: 'Embed a YouTube video.',
  keywords: ['youtube', 'video', 'embed', 'media'],
  component: StandardYouTubeBlock as unknown as BlockComponent,
  attributes: {
    url: {
      type: 'string',
      default: '',
    },
    videoId: {
      type: 'string',
      default: '',
    },
    title: {
      type: 'string',
      default: '',
    },
    autoplay: {
      type: 'boolean',
      default: false,
    },
    muted: {
      type: 'boolean',
      default: false,
    },
    loop: {
      type: 'boolean',
      default: false,
    },
    controls: {
      type: 'boolean',
      default: true,
    },
    startTime: {
      type: 'number',
      default: 0,
    },
    endTime: {
      type: 'number',
      default: 0,
    },
    aspectRatio: {
      type: 'string',
      default: '16:9',
    },
    maxWidth: {
      type: 'number',
      default: 0,
    },
    alignment: {
      type: 'string',
      default: 'center',
    },
    caption: {
      type: 'string',
      default: '',
    },
    showInfo: {
      type: 'boolean',
      default: true,
    },
    showRelated: {
      type: 'boolean',
      default: false,
    },
    modestBranding: {
      type: 'boolean',
      default: true,
    },
    privacyMode: {
      type: 'boolean',
      default: true,
    },
  },
  supports: {
    align: ['left', 'center', 'right', 'wide', 'full'],
    anchor: true,
    className: true,
  },
};

export default youtubeBlockDefinition;

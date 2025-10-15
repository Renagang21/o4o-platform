/**
 * Video Block Definition
 */

import React from 'react';
import { Video } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import StandardVideoBlock from '@/components/editor/blocks/media/StandardVideoBlock';
import { BlockComponent } from '../registry/types';

export const videoBlockDefinition: BlockDefinition = {
  name: 'o4o/video',
  title: 'Video',
  category: 'media',
  icon: <Video className="w-5 h-5" />,
  description: 'Embed a video file or URL.',
  keywords: ['video', 'movie', 'media', 'mp4'],
  component: StandardVideoBlock as unknown as BlockComponent,
  attributes: {
    src: {
      type: 'string',
      default: '',
    },
    poster: {
      type: 'string',
      default: '',
    },
    caption: {
      type: 'string',
      default: '',
    },
    autoplay: {
      type: 'boolean',
      default: false,
    },
    loop: {
      type: 'boolean',
      default: false,
    },
    muted: {
      type: 'boolean',
      default: false,
    },
    controls: {
      type: 'boolean',
      default: true,
    },
    width: {
      type: 'number',
    },
    height: {
      type: 'number',
    },
    aspectRatio: {
      type: 'string',
      default: '16:9',
    },
    objectFit: {
      type: 'string',
      default: 'cover',
    },
    borderRadius: {
      type: 'number',
      default: 0,
    },
    align: {
      type: 'string',
      default: 'center',
    },
    volume: {
      type: 'number',
      default: 1,
    },
    playbackRate: {
      type: 'number',
      default: 1,
    },
  },
  supports: {
    align: ['left', 'center', 'right', 'wide', 'full'],
    anchor: true,
    className: true,
  },
};

export default videoBlockDefinition;

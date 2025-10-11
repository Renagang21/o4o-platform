/**
 * Social Icons Block Definition
 */

import React from 'react';
import { Share2 } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import SocialIconsBlock from '@/components/editor/blocks/SocialIconsBlock';
import { BlockComponent } from '../registry/types';

export const socialBlockDefinition: BlockDefinition = {
  name: 'core/social-links',
  title: 'Social Icons',
  category: 'widgets',
  icon: <Share2 className="w-5 h-5" />,
  description: 'Display links to your social media profiles or sites.',
  keywords: ['social', 'links', 'icons', 'sharing'],
  component: SocialIconsBlock as unknown as BlockComponent,
  attributes: {
    links: {
      type: 'array',
      default: [],
    },
    layout: {
      type: 'string',
      default: 'horizontal',
    },
    style: {
      type: 'string',
      default: 'filled',
    },
    colorMode: {
      type: 'string',
      default: 'brand',
    },
    customColor: {
      type: 'string',
      default: '#000000',
    },
    size: {
      type: 'number',
      default: 32,
    },
    spacing: {
      type: 'number',
      default: 8,
    },
    alignment: {
      type: 'string',
      default: 'left',
    },
    showLabels: {
      type: 'boolean',
      default: false,
    },
    labelPosition: {
      type: 'string',
      default: 'below',
    },
    openInNewTab: {
      type: 'boolean',
      default: true,
    },
    showTooltips: {
      type: 'boolean',
      default: true,
    },
    animationEnabled: {
      type: 'boolean',
      default: true,
    },
    animationType: {
      type: 'string',
      default: 'scale',
    },
  },
  supports: {
    align: true,
    anchor: true,
    className: true,
  },
};

export default socialBlockDefinition;

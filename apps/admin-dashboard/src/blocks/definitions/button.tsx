/**
 * Button Block Definition
 */

import React from 'react';
import { MousePointer2 } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import ButtonBlock from '@/components/editor/blocks/ButtonBlock';
import { BlockComponent } from '../registry/types';

export const buttonBlockDefinition: BlockDefinition = {
  name: 'o4o/button',
  title: 'Button',
  category: 'design',
  icon: <MousePointer2 className="w-5 h-5" />,
  description: 'Prompt visitors to take action with a button-style link.',
  keywords: ['link', 'cta', 'call to action'],
  component: ButtonBlock as unknown as BlockComponent,
  attributes: {
    text: {
      type: 'string',
      default: 'Click me',
    },
    url: {
      type: 'string',
      default: '',
    },
    style: {
      type: 'string',
      default: 'fill',
    },
    width: {
      type: 'number',
    },
    align: {
      type: 'string',
      default: 'left',
    },
    textColor: {
      type: 'string',
      default: '#ffffff',
    },
    backgroundColor: {
      type: 'string',
      default: '#0073aa',
    },
    borderRadius: {
      type: 'number',
      default: 4,
    },
    borderWidth: {
      type: 'number',
      default: 1,
    },
    linkTarget: {
      type: 'string',
      default: '_self',
    },
    rel: {
      type: 'string',
      default: '',
    },
    fontSize: {
      type: 'number',
      default: 16,
    },
    paddingX: {
      type: 'number',
      default: 24,
    },
    paddingY: {
      type: 'number',
      default: 12,
    },
    gradientEnabled: {
      type: 'boolean',
      default: false,
    },
    gradientType: {
      type: 'string',
      default: 'linear',
    },
    gradientAngle: {
      type: 'number',
      default: 45,
    },
    gradientStops: {
      type: 'array',
      default: [],
    },
    gradientShape: {
      type: 'string',
      default: 'circle',
    },
    gradientPosition: {
      type: 'string',
      default: 'center',
    },
    shadowEnabled: {
      type: 'boolean',
      default: false,
    },
    shadowHorizontal: {
      type: 'number',
      default: 0,
    },
    shadowVertical: {
      type: 'number',
      default: 4,
    },
    shadowBlur: {
      type: 'number',
      default: 8,
    },
    shadowSpread: {
      type: 'number',
      default: 0,
    },
    shadowColor: {
      type: 'string',
      default: '#000000',
    },
    shadowOpacity: {
      type: 'number',
      default: 0.2,
    },
    shadowInset: {
      type: 'boolean',
      default: false,
    },
    iconEnabled: {
      type: 'boolean',
      default: false,
    },
    iconName: {
      type: 'string',
    },
    iconPosition: {
      type: 'string',
      default: 'left',
    },
    iconSize: {
      type: 'number',
      default: 16,
    },
    iconGap: {
      type: 'number',
      default: 8,
    },
    iconColor: {
      type: 'string',
    },
  },
  supports: {
    align: true,
    anchor: true,
    className: true,
    color: {
      background: true,
      text: true,
    },
  },
};

export default buttonBlockDefinition;

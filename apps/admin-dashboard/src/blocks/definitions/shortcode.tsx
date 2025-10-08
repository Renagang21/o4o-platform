/**
 * Shortcode Block Definition
 */

import React from 'react';
import { Brackets } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import ShortcodeBlock from '@/components/editor/blocks/ShortcodeBlock';

export const shortcodeBlockDefinition: BlockDefinition = {
  name: 'core/shortcode',
  title: 'Shortcode',
  category: 'widgets',
  icon: <Brackets className="w-5 h-5" />,
  description: 'Insert additional custom elements with a WordPress shortcode.',
  keywords: ['shortcode', 'embed', 'custom'],
  component: ShortcodeBlock,
  attributes: {
    shortcode: {
      type: 'string',
      default: '',
    },
    parameters: {
      type: 'object',
      default: {},
    },
    preview: {
      type: 'string',
      default: '',
    },
    valid: {
      type: 'boolean',
      default: true,
    },
    errorMessage: {
      type: 'string',
      default: '',
    },
  },
  supports: {
    anchor: true,
    className: true,
  },
};

export default shortcodeBlockDefinition;

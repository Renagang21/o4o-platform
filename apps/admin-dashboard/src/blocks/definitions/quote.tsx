/**
 * Quote Block Definition
 */

import React from 'react';
import { Quote } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import EnhancedQuoteBlock from '@/components/editor/blocks/EnhancedQuoteBlock';
import { BlockComponent } from '../registry/types';

export const quoteBlockDefinition: BlockDefinition = {
  name: 'o4o/quote',
  title: 'Quote',
  category: 'text',
  icon: <Quote className="w-5 h-5" />,
  description: 'Give quoted text visual emphasis. "In quoting others, we cite ourselves." — Julio Cortázar',
  keywords: ['quote', 'citation', 'blockquote', 'pullquote'],
  component: EnhancedQuoteBlock as unknown as BlockComponent,
  attributes: {
    quote: {
      type: 'string',
      default: '',
    },
    citation: {
      type: 'string',
      default: '',
    },
    citationUrl: {
      type: 'string',
      default: '',
    },
    author: {
      type: 'string',
      default: '',
    },
    source: {
      type: 'string',
      default: '',
    },
    align: {
      type: 'string',
      default: 'left',
    },
    style: {
      type: 'string',
      default: 'default',
    },
    citationPosition: {
      type: 'string',
      default: 'right',
    },
    citationStyle: {
      type: 'string',
      default: 'italic',
    },
    citationPrefix: {
      type: 'string',
      default: 'dash',
    },
    iconStyle: {
      type: 'string',
      default: 'quotes1',
    },
    iconSize: {
      type: 'number',
      default: 48,
    },
    iconColor: {
      type: 'string',
      default: '#6b7280',
    },
    iconPosition: {
      type: 'string',
      default: 'left',
    },
    showIcon: {
      type: 'boolean',
      default: false,
    },
    theme: {
      type: 'string',
      default: 'default',
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

export default quoteBlockDefinition;

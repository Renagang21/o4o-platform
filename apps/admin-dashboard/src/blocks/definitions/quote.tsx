/**
 * Quote Block Definition
 */

import React from 'react';
import { Quote } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import QuoteBlock from '@/components/editor/blocks/QuoteBlock';
import { BlockComponent } from '../registry/types';

export const quoteBlockDefinition: BlockDefinition = {
  name: 'o4o/quote',
  title: 'Quote',
  category: 'text',
  icon: <Quote className="w-5 h-5" />,
  description: 'Give quoted text visual emphasis. "In quoting others, we cite ourselves." — Julio Cortázar',
  keywords: ['quote', 'citation', 'blockquote'],
  component: QuoteBlock as unknown as BlockComponent,
  attributes: {
    quote: {
      type: 'string',
      default: '',
    },
    citation: {
      type: 'string',
      default: '',
    },
    align: {
      type: 'string',
      default: 'left',
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

/**
 * Paragraph Block Definition
 */

import React from 'react';
import { Type } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import ParagraphBlock from '@/components/editor/blocks/ParagraphBlock';
import { BlockComponent } from '../registry/types';

export const paragraphBlockDefinition: BlockDefinition = {
  name: 'o4o/paragraph',
  title: 'Paragraph',
  category: 'text',
  icon: <Type className="w-5 h-5" />,
  description: 'Start with the basic building block of all narrative.',
  keywords: ['text', 'paragraph', 'content'],
  component: ParagraphBlock as unknown as BlockComponent,
  attributes: {
    content: {
      type: 'string',
      default: '',
    },
    align: {
      type: 'string',
      default: 'left',
    },
    dropCap: {
      type: 'boolean',
      default: false,
    },
    fontSize: {
      type: 'number',
      default: 16,
    },
    textColor: {
      type: 'string',
      default: '#1e293b',
    },
    backgroundColor: {
      type: 'string',
      default: '',
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
    typography: {
      fontSize: true,
      lineHeight: true,
    },
  },
};

export default paragraphBlockDefinition;

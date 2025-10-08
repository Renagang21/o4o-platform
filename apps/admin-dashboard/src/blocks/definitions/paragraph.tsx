/**
 * Paragraph Block Definition
 */

import React from 'react';
import { Type } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import ParagraphBlock from '@/components/editor/blocks/ParagraphBlock';

export const paragraphBlockDefinition: BlockDefinition = {
  name: 'core/paragraph',
  title: 'Paragraph',
  category: 'text',
  icon: <Type className="w-5 h-5" />,
  description: 'Start with the basic building block of all narrative.',
  keywords: ['text', 'paragraph', 'content'],
  component: ParagraphBlock,
  attributes: {
    content: {
      type: 'string',
      default: '',
    },
    align: {
      type: 'string',
    },
    dropCap: {
      type: 'boolean',
      default: false,
    },
    fontSize: {
      type: 'string',
    },
    textColor: {
      type: 'string',
    },
    backgroundColor: {
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
    typography: {
      fontSize: true,
      lineHeight: true,
    },
  },
};

export default paragraphBlockDefinition;

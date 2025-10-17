/**
 * Markdown Block Definition
 */

import React from 'react';
import { FileText } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import MarkdownBlock from '@/components/editor/blocks/MarkdownBlock';
import { BlockComponent } from '../registry/types';

export const markdownBlockDefinition: BlockDefinition = {
  name: 'o4o/markdown',
  title: 'Markdown',
  category: 'text',
  icon: <FileText className="w-5 h-5" />,
  description: 'Write content using Markdown syntax with live preview.',
  keywords: ['markdown', 'md', 'text', 'formatting', 'preview'],
  component: MarkdownBlock as unknown as BlockComponent,
  attributes: {
    markdown: {
      type: 'string',
      default: '',
    },
  },
  supports: {
    anchor: true,
    className: true,
  },
};

export default markdownBlockDefinition;

/**
 * Markdown Reader Block Definition
 * Alias for o4o/markdown block for backward compatibility
 */

import React from 'react';
import { FileText } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import MarkdownBlock from '@/components/editor/blocks/MarkdownBlock';
import { BlockComponent } from '../registry/types';

export const markdownReaderBlockDefinition: BlockDefinition = {
  name: 'o4o/markdown-reader',
  title: 'Markdown Reader',
  category: 'text',
  icon: <FileText className="w-5 h-5" />,
  description: 'Read-only markdown viewer with table of contents.',
  keywords: ['markdown', 'md', 'reader', 'toc', 'documentation'],
  component: MarkdownBlock as unknown as BlockComponent,
  attributes: {
    markdown: {
      type: 'string',
      default: '',
    },
    filename: {
      type: 'string',
      default: '',
    },
  },
  supports: {
    anchor: true,
    className: true,
  },
};

export default markdownReaderBlockDefinition;

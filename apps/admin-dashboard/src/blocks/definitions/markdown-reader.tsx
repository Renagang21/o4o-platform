/**
 * Markdown Reader Block Definition
 */

import React from 'react';
import { FileCode } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import MarkdownReaderBlock from '@/components/editor/blocks/MarkdownReaderBlock';

export const markdownReaderBlockDefinition: BlockDefinition = {
  name: 'o4o/markdown-reader',
  title: 'Markdown Reader',
  category: 'widgets',
  icon: <FileCode className="w-5 h-5" />,
  description: 'Display markdown content from a URL.',
  keywords: ['markdown', 'md', 'document', 'reader'],
  component: MarkdownReaderBlock,
  attributes: {
    url: {
      type: 'string',
      default: '',
    },
    markdownContent: {
      type: 'string',
      default: '',
    },
    fontSize: {
      type: 'number',
      default: 16,
    },
    theme: {
      type: 'string',
      default: 'github',
    },
  },
  supports: {
    anchor: true,
    className: true,
  },
};

export default markdownReaderBlockDefinition;

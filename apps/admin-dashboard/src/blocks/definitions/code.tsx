/**
 * Code Block Definition
 */

import React from 'react';
import { Code } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import CodeBlock from '@/components/editor/blocks/CodeBlock';

export const codeBlockDefinition: BlockDefinition = {
  name: 'core/code',
  title: 'Code',
  category: 'text',
  icon: <Code className="w-5 h-5" />,
  description: 'Display code snippets with syntax highlighting.',
  keywords: ['code', 'snippet', 'programming', 'syntax'],
  component: CodeBlock,
  attributes: {
    language: {
      type: 'string',
      default: 'text',
    },
    code: {
      type: 'string',
      default: '',
    },
  },
  supports: {
    anchor: true,
    className: true,
  },
};

export default codeBlockDefinition;

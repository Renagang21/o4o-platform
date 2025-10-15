/**
 * Code Block Definition
 */

import React from 'react';
import { Code } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import CodeBlock from '@/components/editor/blocks/CodeBlock';
import { BlockComponent } from '../registry/types';

export const codeBlockDefinition: BlockDefinition = {
  name: 'o4o/code',
  title: 'Code',
  category: 'text',
  icon: <Code className="w-5 h-5" />,
  description: 'Display code snippets with syntax highlighting.',
  keywords: ['code', 'snippet', 'programming', 'syntax'],
  component: CodeBlock as unknown as BlockComponent,
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

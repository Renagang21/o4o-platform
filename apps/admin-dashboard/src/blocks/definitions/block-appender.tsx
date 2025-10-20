/**
 * Block Appender Block Definition
 *
 * Special block for adding new blocks to the editor.
 * This block is always present and allows users to create new blocks.
 */

import React from 'react';
import { PlusCircle } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import BlockAppenderBlock from '@/components/editor/blocks/BlockAppenderBlock';
import { BlockComponent } from '../registry/types';

export const blockAppenderDefinition: BlockDefinition = {
  name: 'o4o/block-appender',
  title: 'Block Appender',
  category: 'common',
  icon: <PlusCircle className="w-5 h-5" />,
  description: 'Add new blocks here. Start typing or press "/" for commands.',
  keywords: ['add', 'new', 'create', 'block', 'appender', 'plus'],
  component: BlockAppenderBlock as unknown as BlockComponent,
  attributes: {
    content: {
      type: 'string',
      default: '',
    },
  },
  supports: {
    // Minimal support - this is a special block
    className: true,
  },
  // Special flag to exclude from saving
  isTransient: true,
};

export default blockAppenderDefinition;

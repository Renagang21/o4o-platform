/**
 * Column Block Definition
 * Single column within a Columns block
 */

import React from 'react';
import { Square } from 'lucide-react';
import { BlockDefinition, BlockComponent } from '../registry/types';
import ColumnBlock from '@/components/editor/blocks/ColumnBlock';

export const columnBlockDefinition: BlockDefinition = {
  name: 'o4o/column',
  title: 'Column',
  category: 'layout',
  icon: <Square className="w-5 h-5" />,
  description: 'A single column within a columns block.',
  keywords: ['column', 'layout'],
  component: ColumnBlock as unknown as BlockComponent,
  attributes: {
    width: {
      type: 'number',
      default: 50,
    },
    verticalAlignment: {
      type: 'string',
      default: 'top',
    },
    backgroundColor: {
      type: 'string',
      default: '',
    },
    padding: {
      type: 'number',
      default: 16,
    },
  },
  supports: {
    anchor: true,
    className: true,
    color: {
      background: true,
    },
    spacing: {
      padding: true,
    },
  },
  // Column can only exist within Columns block
  parent: ['o4o/columns'],
};

export default columnBlockDefinition;

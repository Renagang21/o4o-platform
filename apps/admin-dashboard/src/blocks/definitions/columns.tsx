/**
 * Columns Block Definition
 * REFACTORED: Simplified implementation with proper innerBlocks rendering
 */

import React from 'react';
import { Columns } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import { NewColumnsBlock } from '@/components/editor/blocks/gutenberg/NewColumnsBlock';
import { BlockComponent } from '../registry/types';

export const columnsBlockDefinition: BlockDefinition = {
  name: 'o4o/columns',
  title: 'Columns',
  category: 'layout',
  icon: <Columns className="w-5 h-5" />,
  description: 'Display content in multiple columns, with blocks added to each column.',
  keywords: ['columns', 'layout', 'grid', 'split'],
  component: NewColumnsBlock as unknown as BlockComponent,
  attributes: {
    columnCount: {
      type: 'number',
      default: 2,
    },
    verticalAlignment: {
      type: 'string',
      default: 'top',
    },
    isStackedOnMobile: {
      type: 'boolean',
      default: true,
    },
  },
  supports: {
    align: ['wide', 'full'],
    anchor: true,
    className: true,
    color: {
      background: true,
      text: true,
    },
    spacing: {
      padding: true,
      margin: true,
    },
    typography: {
      fontSize: true,
      lineHeight: true,
    },
  },
};

export default columnsBlockDefinition;

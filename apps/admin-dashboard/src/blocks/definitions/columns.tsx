/**
 * Columns Block Definition
 * WordPress Gutenberg 완전 모방
 */

import React from 'react';
import { Columns } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import GutenbergColumnsBlock from '@/components/editor/blocks/GutenbergColumnsBlock';
import { BlockComponent } from '../registry/types';

export const columnsBlockDefinition: BlockDefinition = {
  name: 'o4o/columns',
  title: 'Columns',
  category: 'layout',
  icon: <Columns className="w-5 h-5" />,
  description: 'Display content in multiple columns, with blocks added to each column.',
  keywords: ['columns', 'layout', 'grid', 'split'],
  component: GutenbergColumnsBlock as unknown as BlockComponent,
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
      blockGap: true,
    },
    typography: {
      fontSize: true,
      lineHeight: true,
    },
  },
};

export default columnsBlockDefinition;

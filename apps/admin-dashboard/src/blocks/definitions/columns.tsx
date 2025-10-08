/**
 * Columns Block Definition
 */

import React from 'react';
import { Columns } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import ColumnsBlock from '@/components/editor/blocks/ColumnsBlock';

export const columnsBlockDefinition: BlockDefinition = {
  name: 'core/columns',
  title: 'Columns',
  category: 'layout',
  icon: <Columns className="w-5 h-5" />,
  description: 'Display content in multiple columns, with blocks added to each column.',
  keywords: ['columns', 'layout', 'grid', 'split'],
  component: ColumnsBlock,
  attributes: {
    columns: {
      type: 'array',
      default: [
        { id: '1', width: 50, content: [] },
        { id: '2', width: 50, content: [] }
      ],
    },
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
    gap: {
      type: 'number',
      default: 20,
    },
    minHeight: {
      type: 'number',
      default: 0,
    },
    backgroundColor: {
      type: 'string',
      default: '',
    },
    padding: {
      type: 'number',
      default: 0,
    },
  },
  supports: {
    align: ['wide', 'full'],
    anchor: true,
    className: true,
    color: {
      background: true,
    },
    spacing: {
      padding: true,
      margin: true,
    },
  },
};

export default columnsBlockDefinition;

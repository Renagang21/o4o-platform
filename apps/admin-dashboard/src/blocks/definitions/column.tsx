/**
 * Column Block Definition
 * WordPress Gutenberg 완전 모방
 * Single column within a Columns block
 */

import React from 'react';
import { Square } from 'lucide-react';
import { BlockDefinition, BlockComponent } from '../registry/types';

// Use lazy loading to avoid static/dynamic import conflict
const GutenbergColumnBlock = React.lazy(() => import('@/components/editor/blocks/GutenbergColumnBlock'));

export const columnBlockDefinition: BlockDefinition = {
  name: 'o4o/column',
  title: 'Column',
  category: 'layout',
  icon: <Square className="w-5 h-5" />,
  description: 'A single column within a columns block.',
  keywords: ['column', 'layout'],
  component: GutenbergColumnBlock as unknown as BlockComponent,
  attributes: {
    width: {
      type: 'number',
      default: 50,
    },
    verticalAlignment: {
      type: 'string',
      default: 'top',
    },
  },
  supports: {
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
  },
  // Column can only exist within Columns block
  parent: ['o4o/columns'],
};

export default columnBlockDefinition;

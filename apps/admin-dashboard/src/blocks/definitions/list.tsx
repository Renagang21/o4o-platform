/**
 * List Block Definition
 */

import React from 'react';
import { List } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import ListBlock from '@/components/editor/blocks/ListBlock';
import { BlockComponent } from '../registry/types';

export const listBlockDefinition: BlockDefinition = {
  name: 'o4o/list',
  title: 'List',
  category: 'text',
  icon: <List className="w-5 h-5" />,
  description: 'Create a bulleted or numbered list with rich text formatting.',
  keywords: ['list', 'bullet', 'numbered', 'ordered', 'unordered', 'ul', 'ol'],
  component: ListBlock as unknown as BlockComponent,
  attributes: {
    content: {
      type: 'string',
      default: '',
    },
    type: {
      type: 'string',
      default: 'unordered',
    },
    align: {
      type: 'string',
      default: 'left',
    },
  },
  supports: {
    align: true,
    anchor: true,
    className: true,
  },
};

export default listBlockDefinition;

/**
 * List Block Definition
 */

import React from 'react';
import { List } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import ListBlock from '@/components/editor/blocks/ListBlock';

export const listBlockDefinition: BlockDefinition = {
  name: 'core/list',
  title: 'List',
  category: 'text',
  icon: <List className="w-5 h-5" />,
  description: 'Create a bulleted or numbered list.',
  keywords: ['list', 'bullet', 'numbered', 'ordered', 'unordered'],
  component: ListBlock,
  attributes: {
    items: {
      type: 'array',
      default: [],
    },
    type: {
      type: 'string',
      default: 'unordered',
    },
    style: {
      type: 'string',
      default: 'disc',
    },
    numbering: {
      type: 'string',
      default: 'decimal',
    },
    startNumber: {
      type: 'number',
      default: 1,
    },
    align: {
      type: 'string',
      default: 'left',
    },
    color: {
      type: 'string',
      default: 'default',
    },
  },
  supports: {
    anchor: true,
    className: true,
    color: {
      text: true,
    },
  },
};

export default listBlockDefinition;

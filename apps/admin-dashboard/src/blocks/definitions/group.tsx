/**
 * Group Block Definition
 * Container block for grouping multiple blocks together
 */

import React from 'react';
import { Box } from 'lucide-react';
import { BlockDefinition, BlockComponent } from '../registry/types';
import GroupBlock from '@/components/editor/blocks/GroupBlock';

export const groupBlockDefinition: BlockDefinition = {
  name: 'core/group',
  title: 'Group',
  category: 'layout',
  icon: <Box className="w-5 h-5" />,
  description: 'Gather blocks together in a container.',
  keywords: ['group', 'container', 'wrapper', 'section'],
  component: GroupBlock as unknown as BlockComponent,
  attributes: {
    layout: {
      type: 'string',
      default: 'flow', // 'flow', 'flex', 'grid'
    },
    tagName: {
      type: 'string',
      default: 'div', // 'div', 'section', 'article', 'aside', 'header', 'footer'
    },
    backgroundColor: {
      type: 'string',
      default: '',
    },
    textColor: {
      type: 'string',
      default: '',
    },
    padding: {
      type: 'object',
      default: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    margin: {
      type: 'object',
      default: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    borderRadius: {
      type: 'number',
      default: 0,
    },
    borderWidth: {
      type: 'number',
      default: 0,
    },
    borderColor: {
      type: 'string',
      default: '',
    },
    // Flex layout options
    flexDirection: {
      type: 'string',
      default: 'row', // 'row', 'column'
    },
    flexWrap: {
      type: 'string',
      default: 'nowrap', // 'nowrap', 'wrap'
    },
    justifyContent: {
      type: 'string',
      default: 'flex-start', // 'flex-start', 'center', 'flex-end', 'space-between', 'space-around'
    },
    alignItems: {
      type: 'string',
      default: 'stretch', // 'stretch', 'flex-start', 'center', 'flex-end'
    },
    gap: {
      type: 'number',
      default: 16,
    },
    // Grid layout options
    gridColumns: {
      type: 'number',
      default: 2,
    },
    gridRows: {
      type: 'number',
      default: 1,
    },
    minHeight: {
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
      text: true,
    },
    spacing: {
      padding: true,
      margin: true,
    },
  },
};

export default groupBlockDefinition;

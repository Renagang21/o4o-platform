/**
 * Conditional Block Definition
 * Shows or hides content based on conditions (WordPress Toolset-style)
 */

import React from 'react';
import { GitBranch } from 'lucide-react';
import { BlockDefinition, BlockComponent } from '../registry/types';
import ConditionalBlock from '@/components/editor/blocks/ConditionalBlock';

export const conditionalBlockDefinition: BlockDefinition = {
  name: 'o4o/conditional',
  title: 'Conditional',
  category: 'layout',
  icon: <GitBranch className="w-5 h-5" />,
  description: 'Show or hide content based on conditions like user role, login status, URL parameters, and more.',
  keywords: ['conditional', 'visibility', 'logic', 'conditions', 'show', 'hide'],
  component: ConditionalBlock as unknown as BlockComponent,
  attributes: {
    conditions: {
      type: 'array',
      default: [],
    },
    logicOperator: {
      type: 'string',
      default: 'AND', // 'AND' | 'OR'
    },
    showWhenMet: {
      type: 'boolean',
      default: true, // true = show when conditions met, false = hide when conditions met
    },
    // Visual indicator settings
    showIndicator: {
      type: 'boolean',
      default: true, // Show visual indicator in preview
    },
    indicatorText: {
      type: 'string',
      default: 'Conditional Content',
    },
  },
  supports: {
    anchor: true,
    className: true,
  },
};

export default conditionalBlockDefinition;

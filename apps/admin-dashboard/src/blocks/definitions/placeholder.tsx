/**
 * Placeholder Block Definition
 * Phase 1-C: Placeholder block for missing/requested components
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import PlaceholderBlock from '@/components/editor/blocks/PlaceholderBlock';
import { BlockComponent } from '../registry/types';

export const placeholderBlockDefinition: BlockDefinition = {
  name: 'o4o/placeholder',
  title: 'Placeholder (Missing Component)',
  category: 'widgets',
  icon: <AlertCircle className="w-5 h-5" />,
  description: 'Placeholder for a component that has been requested but not yet implemented.',
  keywords: ['placeholder', 'missing', 'requested', 'ai'],
  component: PlaceholderBlock as unknown as BlockComponent,
  attributes: {
    componentName: {
      type: 'string',
      default: 'Unknown Component',
    },
    reason: {
      type: 'string',
      default: '',
    },
    props: {
      type: 'array',
      default: [],
    },
    style: {
      type: 'string',
      default: '',
    },
    placeholderId: {
      type: 'string',
      default: '',
    },
  },
  supports: {
    anchor: true,
    className: true,
  },
};

export default placeholderBlockDefinition;

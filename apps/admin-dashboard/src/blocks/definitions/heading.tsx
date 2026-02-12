/**
 * Heading Block Definition
 *
 * NEW: Gutenberg-style implementation with CleanBlockWrapper + BlockToolbar
 */

import React from 'react';
import { Heading as HeadingIcon } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import { HeadingBlock } from '@/components/editor/blocks/gutenberg/HeadingBlock';
import { BlockComponent } from '../registry/types';

export const headingBlockDefinition: BlockDefinition = {
  name: 'o4o/heading',
  title: 'Heading',
  category: 'text',
  icon: <HeadingIcon className="w-5 h-5" />,
  description: 'Introduce new sections with formatted text and links.',
  keywords: ['title', 'subtitle', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  component: HeadingBlock as unknown as BlockComponent,
  attributes: {
    content: {
      type: 'string',
      default: '',
    },
    level: {
      type: 'number',
      default: 2,
    },
    align: {
      type: 'string',
      default: 'left',
    },
    fontSize: {
      type: 'number',
    },
    textColor: {
      type: 'string',
    },
    backgroundColor: {
      type: 'string',
    },
  },
  supports: {
    align: true,
    anchor: true,
    className: true,
    color: {
      text: true,
      background: true,
    },
    typography: {
      fontSize: true,
    },
  },
};

export default headingBlockDefinition;

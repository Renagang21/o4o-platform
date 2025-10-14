/**
 * Heading Block Definition
 */

import React from 'react';
import { Heading as HeadingIcon } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import StandardHeadingBlock from '@/components/editor/blocks/text/StandardHeadingBlock';
import { BlockComponent } from '../registry/types';

export const headingBlockDefinition: BlockDefinition = {
  name: 'core/heading',
  title: 'Heading',
  category: 'text',
  icon: <HeadingIcon className="w-5 h-5" />,
  description: 'Introduce new sections and organize content.',
  keywords: ['title', 'subtitle', 'h1', 'h2', 'h3'],
  component: StandardHeadingBlock as unknown as BlockComponent,
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
    },
    textColor: {
      type: 'string',
    },
  },
  supports: {
    align: true,
    anchor: true,
    className: true,
    color: {
      text: true,
    },
  },
};

export default headingBlockDefinition;

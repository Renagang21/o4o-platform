/**
 * Spacer Block Definition
 */

import React from 'react';
import { MoveVertical } from 'lucide-react';
import { BlockDefinition, BlockComponent } from '../registry/types';
import SpacerBlock from '@/components/editor/blocks/SpacerBlock';

export const spacerBlockDefinition: BlockDefinition = {
  name: 'o4o/spacer',
  title: 'Spacer',
  category: 'layout',
  icon: <MoveVertical className="w-5 h-5" />,
  description: '높이 조절 가능한 공백을 추가합니다.',
  keywords: ['space', 'spacing', 'gap', 'margin', 'padding', '여백', '공백'],
  component: SpacerBlock as unknown as BlockComponent,
  attributes: {
    height: {
      type: 'number',
      default: 50,
    },
  },
  supports: {
    html: false,
    reusable: true,
  },
};

export default spacerBlockDefinition;

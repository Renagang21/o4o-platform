/**
 * Separator Block Definition
 */

import React from 'react';
import { Minus } from 'lucide-react';
import { BlockDefinition, BlockComponent } from '../registry/types';
import SeparatorBlock from '@/components/editor/blocks/SeparatorBlock';

export const separatorBlockDefinition: BlockDefinition = {
  name: 'o4o/separator',
  title: 'Separator',
  category: 'layout',
  icon: <Minus className="w-5 h-5" />,
  description: '콘텐츠를 구분하는 수평선을 추가합니다.',
  keywords: ['separator', 'divider', 'line', 'hr', 'horizontal', '구분선', '선', '가로선'],
  component: SeparatorBlock as unknown as BlockComponent,
  attributes: {
    style: {
      type: 'string',
      default: 'solid',
    },
    color: {
      type: 'string',
      default: '#dddddd',
    },
    thickness: {
      type: 'number',
      default: 1,
    },
    width: {
      type: 'number',
      default: 100,
    },
    align: {
      type: 'string',
      default: 'center',
    },
    marginTop: {
      type: 'number',
      default: 20,
    },
    marginBottom: {
      type: 'number',
      default: 20,
    },
  },
  supports: {
    html: false,
    reusable: true,
  },
};

export default separatorBlockDefinition;

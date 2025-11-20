/**
 * IconFeatureList Block Definition
 * 여러 개의 기능/특징을 아이콘과 함께 리스트/그리드 형태로 표시
 */

import React from 'react';
import { Grid3x3 } from 'lucide-react';
import { BlockDefinition, BlockComponent } from '../registry/types';
import IconFeatureListBlock from '@/components/editor/blocks/IconFeatureListBlock';

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

export const DEFAULT_FEATURES: FeatureItem[] = [
  {
    icon: 'check-circle',
    title: '기능 1',
    description: '첫 번째 주요 기능에 대한 설명입니다.',
  },
  {
    icon: 'star',
    title: '기능 2',
    description: '두 번째 주요 기능에 대한 설명입니다.',
  },
  {
    icon: 'zap',
    title: '기능 3',
    description: '세 번째 주요 기능에 대한 설명입니다.',
  },
];

export const iconFeatureListBlockDefinition: BlockDefinition = {
  name: 'o4o/icon-feature-list',
  title: 'Icon Feature List',
  category: 'widgets',
  icon: <Grid3x3 className="w-5 h-5" />,
  description: '여러 개의 기능/특징을 아이콘과 함께 그리드/리스트로 표시',
  keywords: ['feature', 'list', 'icon', 'grid', 'service', 'benefits', '기능', '특징', '리스트'],
  component: IconFeatureListBlock as unknown as BlockComponent,
  attributes: {
    items: {
      type: 'array',
      default: DEFAULT_FEATURES,
    },
    columns: {
      type: 'number',
      default: 3,
    },
    layout: {
      type: 'string',
      default: 'grid',
    },
    iconPosition: {
      type: 'string',
      default: 'top',
    },
    iconSize: {
      type: 'number',
      default: 48,
    },
    iconColor: {
      type: 'string',
      default: '#0073aa',
    },
    titleColor: {
      type: 'string',
      default: '#111827',
    },
    descriptionColor: {
      type: 'string',
      default: '#6b7280',
    },
    backgroundColor: {
      type: 'string',
      default: '#ffffff',
    },
    borderColor: {
      type: 'string',
      default: '#e5e7eb',
    },
    gap: {
      type: 'number',
      default: 24,
    },
  },
  supports: {
    align: true,
    html: false,
    reusable: true,
  },
};

export default iconFeatureListBlockDefinition;

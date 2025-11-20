/**
 * FeatureCard Block Definition
 */

import React from 'react';
import { Star } from 'lucide-react';
import { BlockDefinition, BlockComponent } from '../registry/types';
import FeatureCardBlock from '@/components/editor/blocks/FeatureCardBlock';

export const featureCardBlockDefinition: BlockDefinition = {
  name: 'o4o/feature-card',
  title: 'Feature Card',
  category: 'widgets',
  icon: <Star className="w-5 h-5" />,
  description: '서비스 특징, 기능을 카드 형태로 표시',
  keywords: ['feature', 'card', 'service', 'benefit', 'icon', '기능', '특징', '카드'],
  component: FeatureCardBlock as unknown as BlockComponent,
  attributes: {
    icon: {
      type: 'string',
      default: 'star',
    },
    title: {
      type: 'string',
      default: '기능 제목',
    },
    description: {
      type: 'string',
      default: '기능 설명을 입력하세요',
    },
    link: {
      type: 'string',
      default: '',
    },
    backgroundColor: {
      type: 'string',
      default: '#ffffff',
    },
    borderColor: {
      type: 'string',
      default: '#e5e7eb',
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
    iconSize: {
      type: 'number',
      default: 48,
    },
  },
  supports: {
    html: false,
    reusable: true,
  },
};

export default featureCardBlockDefinition;

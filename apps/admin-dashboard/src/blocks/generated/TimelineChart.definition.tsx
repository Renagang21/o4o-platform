/**
 * TimelineChart Block Definition
 */

import { Clock } from 'lucide-react';
import type { BlockDefinition, BlockComponent } from '../registry/types';
import TimelineChart, { DEFAULT_STEPS } from './TimelineChart';

export const timelineChartBlockDefinition: BlockDefinition = {
  name: 'o4o/timeline-chart',
  title: 'Timeline Chart',
  category: 'widgets',
  icon: <Clock className="w-5 h-5" />,
  description: '시각적인 단계별 프로세스 타임라인 블록',
  keywords: ['timeline', 'chart', 'process', 'steps', 'workflow', 'journey', 'how-it-works'],
  component: TimelineChart as unknown as BlockComponent,
  attributes: {
    steps: {
      type: 'array',
      default: DEFAULT_STEPS,
    },
    variant: {
      type: 'string',
      default: 'vertical',
    },
    iconStyle: {
      type: 'string',
      default: 'circle',
    },
    lineStyle: {
      type: 'string',
      default: 'solid',
    },
    primaryColor: {
      type: 'string',
      default: '#0073aa',
    },
    secondaryColor: {
      type: 'string',
      default: '#6c757d',
    },
    align: {
      type: 'string',
      default: 'left',
    },
  },
  supports: {
    align: true,
    html: false,
    reusable: true,
  },
};

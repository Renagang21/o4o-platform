/**
 * TwoColumn Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const TwoColumnSchema: ComponentDefinition = {
  type: 'TwoColumn',
  label: 'Two Columns',
  category: 'layout',
  icon: '◫',
  description: 'Two column layout',
  allowsChildren: true,
  defaultProps: {
    leftWidth: 50,
    gap: 'md',
    verticalAlign: 'top',
  },
  inspectorConfig: [
    {
      name: 'leftWidth',
      label: 'Left Column Width',
      type: 'select',
      options: [
        { value: 33, label: '33% / 67%' },
        { value: 40, label: '40% / 60%' },
        { value: 50, label: '50% / 50%' },
        { value: 60, label: '60% / 40%' },
        { value: 67, label: '67% / 33%' },
      ],
      defaultValue: 50,
    },
    {
      name: 'gap',
      label: 'Gap',
      type: 'select',
      options: [
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
      ],
      defaultValue: 'md',
    },
    {
      name: 'verticalAlign',
      label: 'Vertical Alignment',
      type: 'select',
      options: [
        { value: 'top', label: 'Top' },
        { value: 'center', label: 'Center' },
        { value: 'bottom', label: 'Bottom' },
      ],
      defaultValue: 'top',
    },
  ],
};

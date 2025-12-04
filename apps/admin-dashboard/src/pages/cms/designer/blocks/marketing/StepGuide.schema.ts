/**
 * StepGuide Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const StepGuideSchema: ComponentDefinition = {
  type: 'StepGuide',
  label: 'Step Guide',
  category: 'marketing',
  icon: '📋',
  description: 'Step-by-step guide item',
  allowsChildren: false,
  defaultProps: {
    stepNumber: 1,
    title: 'Step Title',
    description: 'Description of this step',
    icon: '',
    accentColor: '#3b82f6',
    layout: 'horizontal',
  },
  inspectorConfig: [
    {
      name: 'stepNumber',
      label: 'Step Number',
      type: 'number',
      required: true,
      defaultValue: 1,
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      placeholder: 'Step Title',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Describe this step',
      rows: 3,
    },
    {
      name: 'icon',
      label: 'Icon (Emoji)',
      type: 'text',
      placeholder: 'Leave empty to show step number',
      helpText: 'Optional: use emoji instead of number',
    },
    {
      name: 'accentColor',
      label: 'Accent Color',
      type: 'color',
      defaultValue: '#3b82f6',
    },
    {
      name: 'layout',
      label: 'Layout',
      type: 'select',
      options: [
        { value: 'horizontal', label: 'Horizontal' },
        { value: 'vertical', label: 'Vertical' },
      ],
      defaultValue: 'horizontal',
    },
  ],
};

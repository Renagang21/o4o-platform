/**
 * FeatureGrid Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const FeatureGridSchema: ComponentDefinition = {
  type: 'FeatureGrid',
  label: 'Feature Grid',
  category: 'marketing',
  icon: '🎯',
  description: 'Grid layout for displaying multiple features',
  allowsChildren: true,
  defaultProps: {
    title: 'Our Features',
    subtitle: 'Everything you need to succeed',
    columns: 3,
    gap: 'md',
    bgColor: '#ffffff',
  },
  inspectorConfig: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      placeholder: 'Our Features',
    },
    {
      name: 'subtitle',
      label: 'Subtitle',
      type: 'textarea',
      placeholder: 'Describe your features',
      rows: 2,
    },
    {
      name: 'columns',
      label: 'Columns',
      type: 'select',
      options: [
        { value: 2, label: '2 Columns' },
        { value: 3, label: '3 Columns' },
        { value: 4, label: '4 Columns' },
      ],
      defaultValue: 3,
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
      name: 'bgColor',
      label: 'Background Color',
      type: 'color',
      defaultValue: '#ffffff',
    },
  ],
};

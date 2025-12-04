/**
 * PricingGrid Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const PricingGridSchema: ComponentDefinition = {
  type: 'PricingGrid',
  label: 'Pricing Grid',
  category: 'marketing',
  icon: '💳',
  description: 'Grid layout for pricing cards',
  allowsChildren: true,
  defaultProps: {
    title: 'Choose Your Plan',
    subtitle: 'Select the perfect plan for your needs',
    columns: 3,
    gap: 'md',
    bgColor: '#ffffff',
  },
  inspectorConfig: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      placeholder: 'Choose Your Plan',
    },
    {
      name: 'subtitle',
      label: 'Subtitle',
      type: 'textarea',
      placeholder: 'Describe your pricing',
      rows: 2,
    },
    {
      name: 'columns',
      label: 'Columns',
      type: 'select',
      options: [
        { value: 1, label: '1 Column' },
        { value: 2, label: '2 Columns' },
        { value: 3, label: '3 Columns' },
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

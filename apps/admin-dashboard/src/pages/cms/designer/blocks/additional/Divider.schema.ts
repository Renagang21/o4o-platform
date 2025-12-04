/**
 * Divider Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const DividerSchema: ComponentDefinition = {
  type: 'Divider',
  label: 'Divider',
  category: 'basic',
  icon: '➖',
  description: 'Horizontal divider line',
  allowsChildren: false,
  defaultProps: {
    thickness: 1,
    width: 'full',
    color: '#e5e7eb',
    style: 'solid',
    marginY: 'md',
  },
  inspectorConfig: [
    {
      name: 'thickness',
      label: 'Thickness (px)',
      type: 'number',
      defaultValue: 1,
      min: 1,
      max: 10,
    },
    {
      name: 'width',
      label: 'Width',
      type: 'select',
      options: [
        { value: 'full', label: 'Full Width' },
        { value: 'content', label: 'Content Width (75%)' },
      ],
      defaultValue: 'full',
    },
    {
      name: 'color',
      label: 'Color',
      type: 'color',
      defaultValue: '#e5e7eb',
    },
    {
      name: 'style',
      label: 'Line Style',
      type: 'select',
      options: [
        { value: 'solid', label: 'Solid' },
        { value: 'dashed', label: 'Dashed' },
        { value: 'dotted', label: 'Dotted' },
      ],
      defaultValue: 'solid',
    },
    {
      name: 'marginY',
      label: 'Vertical Margin',
      type: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
      ],
      defaultValue: 'md',
    },
  ],
};

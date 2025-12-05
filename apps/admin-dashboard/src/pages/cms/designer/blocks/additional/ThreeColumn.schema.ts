/**
 * ThreeColumn Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const ThreeColumnSchema: ComponentDefinition = {
  type: 'ThreeColumn',
  label: 'Three Columns',
  category: 'layout',
  icon: '☰',
  description: 'Three column layout',
  allowsChildren: true,
  defaultProps: {
    gap: 'md',
    verticalAlign: 'top',
  },
  inspectorConfig: [
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

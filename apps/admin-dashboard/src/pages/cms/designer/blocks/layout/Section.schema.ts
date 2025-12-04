/**
 * Section Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const SectionSchema: ComponentDefinition = {
  type: 'Section',
  category: 'layout',
  label: 'Section',
  icon: 'Square',
  description: 'Full-width section with background and padding',

  defaultProps: {
    bgColor: 'transparent',
    padding: 'lg',
    maxWidth: 'screen-xl',
  },

  inspectorConfig: [
    {
      name: 'bgColor',
      label: 'Background Color',
      type: 'color',
    },
    {
      name: 'padding',
      label: 'Padding',
      type: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
        { value: 'xl', label: 'Extra Large' },
      ],
    },
    {
      name: 'maxWidth',
      label: 'Max Width',
      type: 'select',
      options: [
        { value: 'full', label: 'Full Width' },
        { value: 'screen-xl', label: 'Screen XL' },
        { value: 'screen-lg', label: 'Screen LG' },
        { value: '7xl', label: '7XL' },
        { value: '6xl', label: '6XL' },
        { value: '5xl', label: '5XL' },
      ],
    },
  ],

  allowsChildren: true,
  maxChildren: 100,
};

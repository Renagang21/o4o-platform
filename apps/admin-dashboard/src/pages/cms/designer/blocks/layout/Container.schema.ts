/**
 * Container Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const ContainerSchema: ComponentDefinition = {
  type: 'Container',
  category: 'layout',
  label: 'Container',
  icon: 'Box',
  description: 'Centered content wrapper with max-width',

  defaultProps: {
    maxWidth: '5xl',
    padding: 'md',
  },

  inspectorConfig: [
    {
      name: 'maxWidth',
      label: 'Max Width',
      type: 'select',
      options: [
        { value: '7xl', label: '7XL (80rem)' },
        { value: '6xl', label: '6XL (72rem)' },
        { value: '5xl', label: '5XL (64rem)' },
        { value: '4xl', label: '4XL (56rem)' },
        { value: '3xl', label: '3XL (48rem)' },
        { value: '2xl', label: '2XL (42rem)' },
        { value: 'xl', label: 'XL (36rem)' },
        { value: 'lg', label: 'LG (32rem)' },
        { value: 'md', label: 'MD (28rem)' },
      ],
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
      ],
    },
  ],

  allowsChildren: true,
  maxChildren: 100,
};

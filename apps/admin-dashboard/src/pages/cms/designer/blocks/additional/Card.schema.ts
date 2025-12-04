/**
 * Card Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const CardSchema: ComponentDefinition = {
  type: 'Card',
  label: 'Card',
  category: 'layout',
  icon: '🃏',
  description: 'Card container',
  allowsChildren: true,
  defaultProps: {
    title: '',
    subtitle: '',
    padding: 'md',
    shadow: 'md',
    bordered: true,
  },
  inspectorConfig: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      placeholder: 'Card Title',
    },
    {
      name: 'subtitle',
      label: 'Subtitle',
      type: 'text',
      placeholder: 'Card subtitle',
    },
    {
      name: 'padding',
      label: 'Padding',
      type: 'select',
      options: [
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
      ],
      defaultValue: 'md',
    },
    {
      name: 'shadow',
      label: 'Shadow',
      type: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
      ],
      defaultValue: 'md',
    },
    {
      name: 'bordered',
      label: 'Show Border',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};

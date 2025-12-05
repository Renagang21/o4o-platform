/**
 * Modal Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const ModalSchema: ComponentDefinition = {
  type: 'Modal',
  label: 'Modal',
  category: 'layout',
  icon: '🗖',
  description: 'Modal/Dialog container',
  allowsChildren: true,
  defaultProps: {
    title: 'Modal Title',
    buttonText: 'Open Modal',
    size: 'md',
  },
  inspectorConfig: [
    {
      name: 'title',
      label: 'Modal Title',
      type: 'text',
      placeholder: 'Modal Title',
    },
    {
      name: 'buttonText',
      label: 'Button Text',
      type: 'text',
      defaultValue: 'Open Modal',
    },
    {
      name: 'size',
      label: 'Modal Size',
      type: 'select',
      options: [
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
      ],
      defaultValue: 'md',
    },
  ],
};

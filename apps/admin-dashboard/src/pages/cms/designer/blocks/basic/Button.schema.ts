/**
 * Button Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const ButtonSchema: ComponentDefinition = {
  type: 'Button',
  category: 'basic',
  label: 'Button',
  icon: 'MousePointerClick',
  description: 'Call-to-action button',

  defaultProps: {
    text: 'Click me',
    href: '#',
    variant: 'primary',
    size: 'md',
    fullWidth: false,
  },

  inspectorConfig: [
    {
      name: 'text',
      label: 'Button Text',
      type: 'text',
      required: true,
    },
    {
      name: 'href',
      label: 'Link URL',
      type: 'text',
    },
    {
      name: 'variant',
      label: 'Variant',
      type: 'select',
      options: [
        { value: 'primary', label: 'Primary' },
        { value: 'secondary', label: 'Secondary' },
        { value: 'outline', label: 'Outline' },
        { value: 'ghost', label: 'Ghost' },
      ],
    },
    {
      name: 'size',
      label: 'Size',
      type: 'select',
      options: [
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
      ],
    },
    {
      name: 'fullWidth',
      label: 'Full Width',
      type: 'boolean',
    },
  ],

  allowsChildren: false,
  maxChildren: 0,
};

/**
 * Badge Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const BadgeSchema: ComponentDefinition = {
  type: 'Badge',
  label: 'Badge',
  category: 'basic',
  icon: '🏷️',
  description: 'Small label or tag',
  allowsChildren: false,
  defaultProps: {
    text: 'Badge',
    variant: 'primary',
    size: 'md',
    rounded: true,
  },
  inspectorConfig: [
    {
      name: 'text',
      label: 'Text',
      type: 'text',
      required: true,
      defaultValue: 'Badge',
    },
    {
      name: 'variant',
      label: 'Variant',
      type: 'select',
      options: [
        { value: 'primary', label: 'Primary (Blue)' },
        { value: 'secondary', label: 'Secondary (Gray)' },
        { value: 'success', label: 'Success (Green)' },
        { value: 'warning', label: 'Warning (Yellow)' },
        { value: 'danger', label: 'Danger (Red)' },
        { value: 'info', label: 'Info (Cyan)' },
      ],
      defaultValue: 'primary',
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
      defaultValue: 'md',
    },
    {
      name: 'rounded',
      label: 'Fully Rounded',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};

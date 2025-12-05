/**
 * IconText Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const IconTextSchema: ComponentDefinition = {
  type: 'IconText',
  label: 'Icon + Text',
  category: 'basic',
  icon: '✨',
  description: 'Icon with text combination',
  allowsChildren: false,
  defaultProps: {
    icon: '✨',
    text: 'Sample Text',
    layout: 'horizontal',
    iconSize: 'md',
    textAlign: 'left',
    gap: 'md',
  },
  inspectorConfig: [
    {
      name: 'icon',
      label: 'Icon (Emoji)',
      type: 'text',
      defaultValue: '✨',
      placeholder: '✨',
    },
    {
      name: 'text',
      label: 'Text',
      type: 'text',
      required: true,
      defaultValue: 'Sample Text',
    },
    {
      name: 'layout',
      label: 'Layout',
      type: 'select',
      options: [
        { value: 'horizontal', label: 'Horizontal' },
        { value: 'vertical', label: 'Vertical' },
      ],
      defaultValue: 'horizontal',
    },
    {
      name: 'iconSize',
      label: 'Icon Size',
      type: 'select',
      options: [
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
        { value: 'xl', label: 'Extra Large' },
      ],
      defaultValue: 'md',
    },
    {
      name: 'textAlign',
      label: 'Text Alignment',
      type: 'select',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
      ],
      defaultValue: 'left',
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
  ],
};

/**
 * Text Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const TextSchema: ComponentDefinition = {
  type: 'Text',
  category: 'basic',
  label: 'Text',
  icon: 'Type',
  description: 'Simple paragraph text',

  defaultProps: {
    text: 'Enter your text here',
    align: 'left',
    color: '#000000',
    size: 'base',
  },

  inspectorConfig: [
    {
      name: 'text',
      label: 'Text',
      type: 'textarea',
      required: true,
    },
    {
      name: 'size',
      label: 'Size',
      type: 'select',
      options: [
        { value: 'sm', label: 'Small' },
        { value: 'base', label: 'Base' },
        { value: 'lg', label: 'Large' },
        { value: 'xl', label: 'Extra Large' },
        { value: '2xl', label: '2X Large' },
      ],
    },
    {
      name: 'align',
      label: 'Alignment',
      type: 'select',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
        { value: 'justify', label: 'Justify' },
      ],
    },
    {
      name: 'color',
      label: 'Color',
      type: 'color',
    },
  ],

  allowsChildren: false,
  maxChildren: 0,
};

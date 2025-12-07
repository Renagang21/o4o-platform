/**
 * Heading Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const HeadingSchema: ComponentDefinition = {
  type: 'Heading',
  category: 'basic',
  label: 'Heading',
  icon: 'Heading',
  description: 'H1-H6 heading elements',

  defaultProps: {
    text: 'Heading Text',
    level: 2,
    align: 'left',
    color: '#000000',
  },

  inspectorConfig: [
    {
      name: 'text',
      label: 'Text',
      type: 'text',
      required: true,
      placeholder: 'Enter heading text...',
    },
    {
      name: 'level',
      label: 'Level',
      type: 'select',
      options: [
        { value: 1, label: 'H1' },
        { value: 2, label: 'H2' },
        { value: 3, label: 'H3' },
        { value: 4, label: 'H4' },
        { value: 5, label: 'H5' },
        { value: 6, label: 'H6' },
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

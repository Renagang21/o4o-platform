/**
 * BulletList Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const BulletListSchema: ComponentDefinition = {
  type: 'BulletList',
  label: 'Bullet List',
  category: 'layout',
  icon: '☰',
  description: 'Bullet or numbered list',
  allowsChildren: false,
  defaultProps: {
    items: ['Item 1', 'Item 2', 'Item 3'],
    type: 'bullet',
    spacing: 'normal',
  },
  inspectorConfig: [
    {
      name: 'type',
      label: 'List Type',
      type: 'select',
      options: [
        { value: 'bullet', label: 'Bullet Points' },
        { value: 'number', label: 'Numbered' },
        { value: 'check', label: 'Checkmarks' },
      ],
      defaultValue: 'bullet',
    },
    {
      name: 'spacing',
      label: 'Spacing',
      type: 'select',
      options: [
        { value: 'tight', label: 'Tight' },
        { value: 'normal', label: 'Normal' },
        { value: 'relaxed', label: 'Relaxed' },
      ],
      defaultValue: 'normal',
    },
  ],
};

/**
 * Spacer Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const SpacerSchema: ComponentDefinition = {
  type: 'Spacer',
  label: 'Spacer',
  category: 'basic',
  icon: '⬜',
  description: 'Vertical spacing / gap',
  allowsChildren: false,
  defaultProps: {
    height: 40,
    showInDesigner: true,
  },
  inspectorConfig: [
    {
      name: 'height',
      label: 'Height (px)',
      type: 'number',
      defaultValue: 40,
      min: 10,
      max: 200,
    },
    {
      name: 'showInDesigner',
      label: 'Show in Designer',
      type: 'boolean',
      defaultValue: true,
      helpText: 'Display border in designer mode',
    },
  ],
};

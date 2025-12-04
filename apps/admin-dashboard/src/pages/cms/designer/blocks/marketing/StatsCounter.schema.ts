/**
 * StatsCounter Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const StatsCounterSchema: ComponentDefinition = {
  type: 'StatsCounter',
  label: 'Stats Counter',
  category: 'marketing',
  icon: '📊',
  description: 'Display statistics with numbers',
  allowsChildren: false,
  defaultProps: {
    number: '10K+',
    label: 'Happy Customers',
    suffix: '',
    prefix: '',
    icon: '✨',
    textColor: '#374151',
    numberColor: '#3b82f6',
  },
  inspectorConfig: [
    {
      name: 'number',
      label: 'Number',
      type: 'text',
      required: true,
      placeholder: '10K+',
      helpText: 'The main statistic number',
    },
    {
      name: 'label',
      label: 'Label',
      type: 'text',
      required: true,
      placeholder: 'Happy Customers',
    },
    {
      name: 'prefix',
      label: 'Prefix',
      type: 'text',
      placeholder: '$',
      helpText: 'Text before the number (e.g., $)',
    },
    {
      name: 'suffix',
      label: 'Suffix',
      type: 'text',
      placeholder: '+',
      helpText: 'Text after the number (e.g., +, %)',
    },
    {
      name: 'icon',
      label: 'Icon (Emoji)',
      type: 'text',
      placeholder: '✨',
    },
    {
      name: 'numberColor',
      label: 'Number Color',
      type: 'color',
      defaultValue: '#3b82f6',
    },
    {
      name: 'textColor',
      label: 'Label Color',
      type: 'color',
      defaultValue: '#374151',
    },
  ],
};

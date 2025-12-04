/**
 * Quote Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const QuoteSchema: ComponentDefinition = {
  type: 'Quote',
  label: 'Quote',
  category: 'basic',
  icon: '💬',
  description: 'Blockquote with citation',
  allowsChildren: false,
  defaultProps: {
    quote: 'This is a quote.',
    author: '',
    source: '',
    style: 'default',
    size: 'lg',
  },
  inspectorConfig: [
    {
      name: 'quote',
      label: 'Quote',
      type: 'textarea',
      required: true,
      defaultValue: 'This is a quote.',
      rows: 3,
    },
    {
      name: 'author',
      label: 'Author',
      type: 'text',
      placeholder: 'John Doe',
    },
    {
      name: 'source',
      label: 'Source',
      type: 'text',
      placeholder: 'Book Title',
    },
    {
      name: 'style',
      label: 'Style',
      type: 'select',
      options: [
        { value: 'default', label: 'Default (Left Border)' },
        { value: 'bordered', label: 'Bordered' },
        { value: 'highlighted', label: 'Highlighted (Blue BG)' },
      ],
      defaultValue: 'default',
    },
    {
      name: 'size',
      label: 'Text Size',
      type: 'select',
      options: [
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
        { value: 'xl', label: 'Extra Large' },
      ],
      defaultValue: 'lg',
    },
  ],
};

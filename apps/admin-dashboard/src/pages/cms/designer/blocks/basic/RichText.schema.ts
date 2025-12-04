/**
 * RichText Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const RichTextSchema: ComponentDefinition = {
  type: 'RichText',
  category: 'basic',
  label: 'Rich Text',
  icon: 'FileText',
  description: 'Formatted text with HTML support',

  defaultProps: {
    html: '<p>Enter your rich text here. You can use <strong>bold</strong>, <em>italic</em>, and <a href="#">links</a>.</p>',
    maxWidth: '100%',
  },

  inspectorConfig: [
    {
      name: 'html',
      label: 'HTML Content',
      type: 'textarea',
      required: true,
      rows: 10,
    },
    {
      name: 'maxWidth',
      label: 'Max Width',
      type: 'text',
      placeholder: '100%, 800px, 50rem',
    },
  ],

  allowsChildren: false,
  maxChildren: 0,
};

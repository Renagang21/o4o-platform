/**
 * Pagination Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const PaginationSchema: ComponentDefinition = {
  type: 'Pagination',
  label: 'Pagination',
  category: 'cms',
  icon: '📄',
  description: 'Page navigation for content lists',
  allowsChildren: false,
  defaultProps: {
    style: 'default',
    showFirstLast: true,
    maxPages: 5,
    prevLabel: 'Previous',
    nextLabel: 'Next',
    activeColor: '#3b82f6',
  },
  inspectorConfig: [
    {
      name: 'style',
      label: 'Style',
      type: 'select',
      options: [
        { value: 'default', label: 'Default' },
        { value: 'rounded', label: 'Rounded' },
        { value: 'simple', label: 'Simple (Prev/Next only)' },
      ],
      defaultValue: 'default',
    },
    {
      name: 'showFirstLast',
      label: 'Show First/Last Buttons',
      type: 'boolean',
      defaultValue: true,
      helpText: 'Only for default and rounded styles',
    },
    {
      name: 'maxPages',
      label: 'Max Page Numbers Shown',
      type: 'number',
      defaultValue: 5,
      min: 3,
      max: 10,
      helpText: 'Maximum page numbers to display',
    },
    {
      name: 'prevLabel',
      label: 'Previous Label',
      type: 'text',
      defaultValue: 'Previous',
      placeholder: 'Previous',
    },
    {
      name: 'nextLabel',
      label: 'Next Label',
      type: 'text',
      defaultValue: 'Next',
      placeholder: 'Next',
    },
    {
      name: 'activeColor',
      label: 'Active Page Color',
      type: 'color',
      defaultValue: '#3b82f6',
    },
  ],
};

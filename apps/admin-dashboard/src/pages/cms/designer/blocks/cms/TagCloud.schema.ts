/**
 * TagCloud Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const TagCloudSchema: ComponentDefinition = {
  type: 'TagCloud',
  label: 'Tag Cloud',
  category: 'cms',
  icon: '☁️',
  description: 'Display tag cloud with varying sizes',
  allowsChildren: false,
  defaultProps: {
    taxonomy: 'post_tag',
    minSize: 12,
    maxSize: 24,
    limit: 30,
    orderBy: 'count',
  },
  inspectorConfig: [
    {
      name: 'taxonomy',
      label: 'Taxonomy',
      type: 'text',
      defaultValue: 'post_tag',
      placeholder: 'post_tag',
      helpText: 'Taxonomy slug for tags',
    },
    {
      name: 'minSize',
      label: 'Minimum Font Size (px)',
      type: 'number',
      defaultValue: 12,
      min: 8,
      max: 20,
    },
    {
      name: 'maxSize',
      label: 'Maximum Font Size (px)',
      type: 'number',
      defaultValue: 24,
      min: 16,
      max: 48,
    },
    {
      name: 'limit',
      label: 'Maximum Tags',
      type: 'number',
      defaultValue: 30,
      min: 5,
      max: 100,
    },
    {
      name: 'orderBy',
      label: 'Order By',
      type: 'select',
      options: [
        { value: 'name', label: 'Name' },
        { value: 'count', label: 'Usage Count' },
      ],
      defaultValue: 'count',
    },
  ],
};

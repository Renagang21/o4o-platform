/**
 * CategoryList Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const CategoryListSchema: ComponentDefinition = {
  type: 'CategoryList',
  label: 'Category List',
  category: 'cms',
  icon: '🏷️',
  description: 'Display list of categories or taxonomies',
  allowsChildren: false,
  defaultProps: {
    taxonomy: 'category',
    layout: 'list',
    showCount: true,
    orderBy: 'name',
    order: 'asc',
    limit: 20,
  },
  inspectorConfig: [
    {
      name: 'taxonomy',
      label: 'Taxonomy',
      type: 'text',
      defaultValue: 'category',
      placeholder: 'category',
      helpText: 'Taxonomy slug (e.g., category, post_tag)',
    },
    {
      name: 'layout',
      label: 'Layout',
      type: 'select',
      options: [
        { value: 'list', label: 'List' },
        { value: 'grid', label: 'Grid' },
        { value: 'pills', label: 'Pills' },
      ],
      defaultValue: 'list',
    },
    {
      name: 'showCount',
      label: 'Show Post Count',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'orderBy',
      label: 'Order By',
      type: 'select',
      options: [
        { value: 'name', label: 'Name' },
        { value: 'count', label: 'Post Count' },
      ],
      defaultValue: 'name',
    },
    {
      name: 'order',
      label: 'Order',
      type: 'select',
      options: [
        { value: 'asc', label: 'Ascending' },
        { value: 'desc', label: 'Descending' },
      ],
      defaultValue: 'asc',
    },
    {
      name: 'limit',
      label: 'Maximum Items',
      type: 'number',
      defaultValue: 20,
      min: 1,
      max: 100,
    },
  ],
};

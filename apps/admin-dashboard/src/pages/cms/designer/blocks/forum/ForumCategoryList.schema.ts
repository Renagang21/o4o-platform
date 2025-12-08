/**
 * ForumCategoryList Block Schema
 *
 * Displays forum categories in a grid or list
 */

import { ComponentDefinition } from '../../types/designer.types';

export const ForumCategoryListSchema: ComponentDefinition = {
  type: 'ForumCategoryList',
  label: 'Forum Categories',
  category: 'forum',
  icon: '📁',
  description: 'Display forum categories in grid or list layout',
  allowsChildren: false,
  defaultProps: {
    columns: 3,
    showDescription: true,
    showPostCount: true,
    showIcon: true,
    parentId: '',
  },
  inspectorConfig: [
    {
      name: 'parentId',
      label: 'Parent Category',
      type: 'text',
      placeholder: 'Leave empty for root categories',
      helpText: 'Parent category ID to show subcategories',
    },
    {
      name: 'columns',
      label: 'Columns',
      type: 'select',
      options: [
        { value: 1, label: '1 Column' },
        { value: 2, label: '2 Columns' },
        { value: 3, label: '3 Columns' },
        { value: 4, label: '4 Columns' },
      ],
      defaultValue: 3,
    },
    {
      name: 'showDescription',
      label: 'Show Description',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showPostCount',
      label: 'Show Post Count',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showIcon',
      label: 'Show Category Icon',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};

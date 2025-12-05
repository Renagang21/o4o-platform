/**
 * CPTList Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const CPTListSchema: ComponentDefinition = {
  type: 'CPTList',
  label: 'CPT List',
  category: 'cms',
  icon: '📋',
  description: 'Display list of custom post type items',
  allowsChildren: true,
  defaultProps: {
    postType: 'post',
    limit: 10,
    columns: 3,
    orderBy: 'date',
    order: 'desc',
    showExcerpt: true,
    showImage: true,
    showDate: true,
  },
  inspectorConfig: [
    {
      name: 'postType',
      label: 'Post Type',
      type: 'text',
      required: true,
      placeholder: 'post',
      helpText: 'Slug of the custom post type',
    },
    {
      name: 'limit',
      label: 'Number of Items',
      type: 'number',
      defaultValue: 10,
      min: 1,
      max: 100,
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
      name: 'orderBy',
      label: 'Order By',
      type: 'select',
      options: [
        { value: 'date', label: 'Date' },
        { value: 'title', label: 'Title' },
        { value: 'random', label: 'Random' },
      ],
      defaultValue: 'date',
    },
    {
      name: 'order',
      label: 'Order',
      type: 'select',
      options: [
        { value: 'desc', label: 'Descending' },
        { value: 'asc', label: 'Ascending' },
      ],
      defaultValue: 'desc',
    },
    {
      name: 'showImage',
      label: 'Show Featured Image',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showDate',
      label: 'Show Date',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showExcerpt',
      label: 'Show Excerpt',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};

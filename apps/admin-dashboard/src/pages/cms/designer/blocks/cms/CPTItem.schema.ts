/**
 * CPTItem Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const CPTItemSchema: ComponentDefinition = {
  type: 'CPTItem',
  label: 'CPT Item',
  category: 'cms',
  icon: '📄',
  description: 'Display single custom post type item',
  allowsChildren: false,
  defaultProps: {
    postType: 'post',
    postId: '',
    layout: 'card',
    showImage: true,
    showDate: true,
    showAuthor: false,
    showExcerpt: true,
    showCategories: false,
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
      name: 'postId',
      label: 'Post ID',
      type: 'text',
      placeholder: 'Leave empty for current post',
      helpText: 'Specific post ID, or leave empty to use current post context',
    },
    {
      name: 'layout',
      label: 'Layout',
      type: 'select',
      options: [
        { value: 'card', label: 'Card' },
        { value: 'full', label: 'Full Article' },
        { value: 'minimal', label: 'Minimal' },
      ],
      defaultValue: 'card',
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
      name: 'showAuthor',
      label: 'Show Author',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'showExcerpt',
      label: 'Show Excerpt',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showCategories',
      label: 'Show Categories',
      type: 'boolean',
      defaultValue: false,
    },
  ],
};

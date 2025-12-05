/**
 * RecentPosts Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const RecentPostsSchema: ComponentDefinition = {
  type: 'RecentPosts',
  label: 'Recent Posts',
  category: 'cms',
  icon: '📰',
  description: 'Display recent posts list',
  allowsChildren: false,
  defaultProps: {
    postType: 'post',
    limit: 5,
    layout: 'list',
    showImage: true,
    showDate: true,
    showExcerpt: false,
  },
  inspectorConfig: [
    {
      name: 'postType',
      label: 'Post Type',
      type: 'text',
      defaultValue: 'post',
      placeholder: 'post',
    },
    {
      name: 'limit',
      label: 'Number of Posts',
      type: 'number',
      defaultValue: 5,
      min: 1,
      max: 20,
    },
    {
      name: 'layout',
      label: 'Layout',
      type: 'select',
      options: [
        { value: 'list', label: 'List' },
        { value: 'compact', label: 'Compact' },
      ],
      defaultValue: 'list',
    },
    {
      name: 'showImage',
      label: 'Show Thumbnail',
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
      defaultValue: false,
    },
  ],
};

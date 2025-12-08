/**
 * ForumPostList Block Schema
 *
 * Displays a list of forum posts with filtering and pagination
 */

import { ComponentDefinition } from '../../types/designer.types';

export const ForumPostListSchema: ComponentDefinition = {
  type: 'ForumPostList',
  label: 'Forum Post List',
  category: 'forum',
  icon: '📋',
  description: 'Display list of forum posts with filters and pagination',
  allowsChildren: false,
  defaultProps: {
    categoryId: '',
    limit: 20,
    view: 'list',
    showCategory: true,
    showAuthor: true,
    showStats: true,
    showTags: true,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  },
  inspectorConfig: [
    {
      name: 'categoryId',
      label: 'Filter by Category',
      type: 'text',
      placeholder: 'Leave empty for all categories',
      helpText: 'Category ID to filter posts',
    },
    {
      name: 'limit',
      label: 'Posts per Page',
      type: 'number',
      defaultValue: 20,
      min: 5,
      max: 100,
    },
    {
      name: 'view',
      label: 'View Style',
      type: 'select',
      options: [
        { value: 'list', label: 'List View' },
        { value: 'compact', label: 'Compact View' },
        { value: 'card', label: 'Card View' },
      ],
      defaultValue: 'list',
    },
    {
      name: 'showCategory',
      label: 'Show Category',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showAuthor',
      label: 'Show Author',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showStats',
      label: 'Show Stats',
      type: 'boolean',
      defaultValue: true,
      helpText: 'Show view count, comment count, like count',
    },
    {
      name: 'showTags',
      label: 'Show Tags',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'sortBy',
      label: 'Sort By',
      type: 'select',
      options: [
        { value: 'createdAt', label: 'Created Date' },
        { value: 'updatedAt', label: 'Updated Date' },
        { value: 'viewCount', label: 'View Count' },
        { value: 'commentCount', label: 'Comment Count' },
        { value: 'likeCount', label: 'Like Count' },
      ],
      defaultValue: 'createdAt',
    },
    {
      name: 'sortOrder',
      label: 'Sort Order',
      type: 'select',
      options: [
        { value: 'DESC', label: 'Descending' },
        { value: 'ASC', label: 'Ascending' },
      ],
      defaultValue: 'DESC',
    },
  ],
};

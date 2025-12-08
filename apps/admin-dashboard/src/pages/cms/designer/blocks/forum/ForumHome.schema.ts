/**
 * ForumHome Block Schema
 *
 * Displays forum homepage with categories, stats, pinned posts, and recent activity
 */

import { ComponentDefinition } from '../../types/designer.types';

export const ForumHomeSchema: ComponentDefinition = {
  type: 'ForumHome',
  label: 'Forum Home',
  category: 'forum',
  icon: '🏠',
  description: 'Complete forum homepage with categories, stats, and recent posts',
  allowsChildren: false,
  defaultProps: {
    showStats: true,
    showCategories: true,
    showPinnedPosts: true,
    showRecentPosts: true,
    recentPostsLimit: 10,
    categoryColumns: 3,
  },
  inspectorConfig: [
    {
      name: 'showStats',
      label: 'Show Statistics',
      type: 'boolean',
      defaultValue: true,
      helpText: 'Display forum statistics (posts, comments, users)',
    },
    {
      name: 'showCategories',
      label: 'Show Categories',
      type: 'boolean',
      defaultValue: true,
      helpText: 'Display forum category cards',
    },
    {
      name: 'categoryColumns',
      label: 'Category Columns',
      type: 'select',
      options: [
        { value: 2, label: '2 Columns' },
        { value: 3, label: '3 Columns' },
        { value: 4, label: '4 Columns' },
      ],
      defaultValue: 3,
    },
    {
      name: 'showPinnedPosts',
      label: 'Show Pinned Posts',
      type: 'boolean',
      defaultValue: true,
      helpText: 'Display pinned/announcement posts',
    },
    {
      name: 'showRecentPosts',
      label: 'Show Recent Posts',
      type: 'boolean',
      defaultValue: true,
      helpText: 'Display recent forum posts',
    },
    {
      name: 'recentPostsLimit',
      label: 'Recent Posts Limit',
      type: 'number',
      defaultValue: 10,
      min: 5,
      max: 50,
    },
  ],
};

/**
 * ForumPostDetail Block Schema
 *
 * Displays a single forum post with full content
 */

import { ComponentDefinition } from '../../types/designer.types';

export const ForumPostDetailSchema: ComponentDefinition = {
  type: 'ForumPostDetail',
  label: 'Forum Post Detail',
  category: 'forum',
  icon: '📄',
  description: 'Display single forum post with full content and actions',
  allowsChildren: false,
  defaultProps: {
    showAuthor: true,
    showDate: true,
    showStats: true,
    showTags: true,
    showActions: true,
    showRelatedPosts: true,
    relatedPostsLimit: 5,
  },
  inspectorConfig: [
    {
      name: 'showAuthor',
      label: 'Show Author Card',
      type: 'boolean',
      defaultValue: true,
      helpText: 'Display author information card',
    },
    {
      name: 'showDate',
      label: 'Show Date',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showStats',
      label: 'Show Stats',
      type: 'boolean',
      defaultValue: true,
      helpText: 'Show view, comment, and like counts',
    },
    {
      name: 'showTags',
      label: 'Show Tags',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showActions',
      label: 'Show Actions',
      type: 'boolean',
      defaultValue: true,
      helpText: 'Show like, bookmark, share, report buttons',
    },
    {
      name: 'showRelatedPosts',
      label: 'Show Related Posts',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'relatedPostsLimit',
      label: 'Related Posts Limit',
      type: 'number',
      defaultValue: 5,
      min: 3,
      max: 10,
    },
  ],
};

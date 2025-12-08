/**
 * ForumCommentSection Block Schema
 *
 * Displays comment section for forum posts
 */

import { ComponentDefinition } from '../../types/designer.types';

export const ForumCommentSectionSchema: ComponentDefinition = {
  type: 'ForumCommentSection',
  label: 'Forum Comments',
  category: 'forum',
  icon: '💬',
  description: 'Comment section with nested replies and moderation',
  allowsChildren: false,
  defaultProps: {
    sortBy: 'newest',
    maxDepth: 2,
    showForm: true,
    showCount: true,
    commentsPerPage: 20,
  },
  inspectorConfig: [
    {
      name: 'sortBy',
      label: 'Default Sort',
      type: 'select',
      options: [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'popular', label: 'Most Popular' },
      ],
      defaultValue: 'newest',
    },
    {
      name: 'maxDepth',
      label: 'Max Reply Depth',
      type: 'select',
      options: [
        { value: 1, label: '1 Level' },
        { value: 2, label: '2 Levels' },
        { value: 3, label: '3 Levels' },
      ],
      defaultValue: 2,
      helpText: 'Maximum nesting depth for replies',
    },
    {
      name: 'showForm',
      label: 'Show Comment Form',
      type: 'boolean',
      defaultValue: true,
      helpText: 'Display comment input form',
    },
    {
      name: 'showCount',
      label: 'Show Comment Count',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'commentsPerPage',
      label: 'Comments per Page',
      type: 'number',
      defaultValue: 20,
      min: 10,
      max: 100,
    },
  ],
};

/**
 * RelatedPosts Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const RelatedPostsSchema: ComponentDefinition = {
  type: 'RelatedPosts',
  label: 'Related Posts',
  category: 'cms',
  icon: '🔗',
  description: 'Display posts related to current post',
  allowsChildren: false,
  defaultProps: {
    postType: 'post',
    limit: 3,
    relatedBy: 'category',
    layout: 'grid',
    showImage: true,
    showDate: false,
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
      defaultValue: 3,
      min: 1,
      max: 12,
    },
    {
      name: 'relatedBy',
      label: 'Related By',
      type: 'select',
      options: [
        { value: 'category', label: 'Category' },
        { value: 'tag', label: 'Tag' },
        { value: 'author', label: 'Author' },
      ],
      defaultValue: 'category',
    },
    {
      name: 'layout',
      label: 'Layout',
      type: 'select',
      options: [
        { value: 'grid', label: 'Grid' },
        { value: 'list', label: 'List' },
      ],
      defaultValue: 'grid',
    },
    {
      name: 'showImage',
      label: 'Show Image',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showDate',
      label: 'Show Date',
      type: 'boolean',
      defaultValue: false,
    },
  ],
};

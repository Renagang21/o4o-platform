/**
 * Post Form Block Definition
 *
 * Form for creating/updating standard WordPress posts
 */

import React from 'react';
import { FileText } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import PostFormBlock from '@/components/editor/blocks/PostFormBlock';
import { BlockComponent } from '../registry/types';

export const postFormBlockDefinition: BlockDefinition = {
  name: 'o4o/post-form',
  title: 'Post Form',
  category: 'dynamic',
  icon: <FileText className="w-5 h-5" />,
  description: 'Form for creating or editing blog posts',
  keywords: ['form', 'post', 'blog', 'submit'],
  component: PostFormBlock as unknown as BlockComponent,
  attributes: {
    formAction: {
      type: 'string',
      default: 'create', // 'create' | 'edit'
    },
    postId: {
      type: 'string',
      default: '', // For edit action
    },
    successMessage: {
      type: 'string',
      default: 'Post submitted successfully!',
    },
    errorMessage: {
      type: 'string',
      default: 'An error occurred. Please try again.',
    },
    redirectUrl: {
      type: 'string',
      default: '',
    },
    showSuccessMessage: {
      type: 'boolean',
      default: true,
    },
    resetOnSubmit: {
      type: 'boolean',
      default: true,
    },
    defaultStatus: {
      type: 'string',
      default: 'draft', // 'draft' | 'published'
    },
  },
  innerBlocksSettings: {
    allowedBlocks: ['o4o/form-field', 'o4o/form-submit'],
    template: [
      ['o4o/form-field', {
        name: 'title',
        label: 'Title',
        fieldType: 'text',
        required: true,
        placeholder: 'Enter post title...'
      }],
      ['o4o/form-field', {
        name: 'content',
        label: 'Content',
        fieldType: 'textarea',
        placeholder: 'Write your post content...',
        rows: 10
      }],
      ['o4o/form-field', {
        name: 'excerpt',
        label: 'Excerpt',
        fieldType: 'textarea',
        placeholder: 'Brief summary...',
        rows: 3
      }],
      ['o4o/form-submit', {
        buttonText: 'Publish Post'
      }]
    ],
    templateLock: false,
  },
  supports: {
    anchor: true,
    className: true,
  },
};

export default postFormBlockDefinition;

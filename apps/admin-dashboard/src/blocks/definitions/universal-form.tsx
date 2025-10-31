/**
 * Universal Form Block Definition
 *
 * Unified form block for both Posts and Custom Post Types
 * Replaces post-form and cpt-form with a single dynamic block
 */

import React from 'react';
import { FileEdit } from 'lucide-react';
import { BlockDefinition, BlockComponent } from '../registry/types';
import UniversalFormBlock from '@/components/editor/blocks/UniversalFormBlock';

export const universalFormBlockDefinition: BlockDefinition = {
  name: 'o4o/universal-form',
  title: 'Universal Form',
  category: 'dynamic',
  icon: <FileEdit className="w-5 h-5" />,
  description: 'Create or edit Posts and Custom Post Type entries with a single dynamic form.',
  keywords: ['form', 'post', 'cpt', 'custom post type', 'create', 'edit', 'universal'],
  component: UniversalFormBlock as unknown as BlockComponent,
  attributes: {
    postType: {
      type: 'string',
      default: 'post',
    },
    formAction: {
      type: 'string',
      default: 'create',
      enum: ['create', 'edit'],
    },
    postId: {
      type: 'string',
      default: '',
    },
    defaultStatus: {
      type: 'string',
      default: 'draft',
      enum: ['draft', 'published'],
    },
    redirectUrl: {
      type: 'string',
      default: '',
    },
    successMessage: {
      type: 'string',
      default: 'Entry submitted successfully!',
    },
    errorMessage: {
      type: 'string',
      default: 'Failed to submit. Please try again.',
    },
    showSuccessMessage: {
      type: 'boolean',
      default: true,
    },
    resetOnSubmit: {
      type: 'boolean',
      default: false,
    },
    allowedBlocks: {
      type: 'array',
      default: ['o4o/form-field', 'o4o/form-submit'],
    },
  },
  supports: {
    anchor: true,
    className: true,
    customClassName: true,
    inserter: true,
  },
  innerBlocksSettings: {
    allowedBlocks: ['o4o/form-field', 'o4o/form-submit'],
  },
  example: {
    attributes: {
      postType: 'post',
      formAction: 'create',
    },
    innerBlocks: [
      {
        name: 'o4o/form-field',
        attributes: {
          name: 'title',
          label: 'Title',
          fieldType: 'text',
          required: true,
          mapToField: 'title',
        },
      },
      {
        name: 'o4o/form-field',
        attributes: {
          name: 'content',
          label: 'Content',
          fieldType: 'textarea',
          required: true,
          mapToField: 'content',
        },
      },
      {
        name: 'o4o/form-submit',
        attributes: {
          text: 'Submit Post',
        },
      },
    ],
  },
};

export default universalFormBlockDefinition;

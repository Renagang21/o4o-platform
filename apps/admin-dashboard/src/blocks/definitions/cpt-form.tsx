/**
 * CPT Form Block Definition
 *
 * Form for creating/updating Custom Post Type entries
 */

import React from 'react';
import { Database } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import CptFormBlock from '@/components/editor/blocks/CptFormBlock';
import { BlockComponent } from '../registry/types';

export const cptFormBlockDefinition: BlockDefinition = {
  name: 'o4o/cpt-form',
  title: 'CPT Form',
  category: 'dynamic',
  icon: <Database className="w-5 h-5" />,
  description: 'Form for creating or editing custom post type entries',
  keywords: ['form', 'cpt', 'custom post type', 'submit'],
  component: CptFormBlock as unknown as BlockComponent,
  attributes: {
    cptSlug: {
      type: 'string',
      default: 'ds_product', // CPT slug
    },
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
      default: 'Entry submitted successfully!',
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
        placeholder: 'Enter title...'
      }],
      ['o4o/form-field', {
        name: 'content',
        label: 'Description',
        fieldType: 'textarea',
        placeholder: 'Enter description...',
        rows: 6
      }],
      ['o4o/form-submit', {
        buttonText: 'Submit'
      }]
    ],
    templateLock: false,
  },
  supports: {
    anchor: true,
    className: true,
  },
};

export default cptFormBlockDefinition;

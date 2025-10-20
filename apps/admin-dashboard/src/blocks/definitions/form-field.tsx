/**
 * Form Field Block Definition
 *
 * Individual form field (text, email, textarea, etc.)
 * Can be used inside Post Form or CPT Form blocks
 */

import React from 'react';
import { Square } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import FormFieldBlock from '@/components/editor/blocks/FormFieldBlock';
import { BlockComponent } from '../registry/types';

export const formFieldBlockDefinition: BlockDefinition = {
  name: 'o4o/form-field',
  title: 'Form Field',
  category: 'dynamic',
  icon: <Square className="w-5 h-5" />,
  description: 'A single form field (text, email, textarea, etc.)',
  keywords: ['input', 'field', 'form', 'text'],
  component: FormFieldBlock as unknown as BlockComponent,
  parent: ['o4o/post-form', 'o4o/cpt-form'],
  attributes: {
    name: {
      type: 'string',
      default: '',
    },
    label: {
      type: 'string',
      default: 'Field Label',
    },
    fieldType: {
      type: 'string',
      default: 'text', // 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file'
    },
    placeholder: {
      type: 'string',
      default: '',
    },
    defaultValue: {
      type: 'string',
      default: '',
    },
    required: {
      type: 'boolean',
      default: false,
    },
    helpText: {
      type: 'string',
      default: '',
    },
    // For textarea
    rows: {
      type: 'number',
      default: 4,
    },
    // For select/radio/checkbox
    options: {
      type: 'array',
      default: [], // [{ label: 'Option 1', value: '1' }]
    },
    // For ACF integration
    acfFieldKey: {
      type: 'string',
      default: '', // ACF field key to map to
    },
    // For CPT mapping
    mapToField: {
      type: 'string',
      default: '', // 'title' | 'content' | 'excerpt' | 'meta.{key}'
    },
    // Validation
    minLength: {
      type: 'number',
      default: 0,
    },
    maxLength: {
      type: 'number',
      default: 0,
    },
    pattern: {
      type: 'string',
      default: '', // Regex pattern
    },
    min: {
      type: 'number',
      default: 0, // For number type
    },
    max: {
      type: 'number',
      default: 0, // For number type
    },
  },
  supports: {
    className: true,
  },
};

export default formFieldBlockDefinition;

/**
 * Form Submit Block Definition
 *
 * Submit button for forms
 * Must be used inside Post Form or CPT Form blocks
 */

import React from 'react';
import { Send } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import FormSubmitBlock from '@/components/editor/blocks/FormSubmitBlock';
import { BlockComponent } from '../registry/types';

export const formSubmitBlockDefinition: BlockDefinition = {
  name: 'o4o/form-submit',
  title: 'Form Submit',
  category: 'dynamic',
  icon: <Send className="w-5 h-5" />,
  description: 'Submit button for forms',
  keywords: ['button', 'submit', 'send', 'form'],
  component: FormSubmitBlock as unknown as BlockComponent,
  parent: ['o4o/post-form', 'o4o/cpt-form'],
  attributes: {
    buttonText: {
      type: 'string',
      default: 'Submit',
    },
    loadingText: {
      type: 'string',
      default: 'Submitting...',
    },
    align: {
      type: 'string',
      default: 'left', // 'left' | 'center' | 'right'
    },
    fullWidth: {
      type: 'boolean',
      default: false,
    },
    buttonStyle: {
      type: 'string',
      default: 'primary', // 'primary' | 'secondary' | 'outline'
    },
  },
  supports: {
    className: true,
  },
};

export default formSubmitBlockDefinition;

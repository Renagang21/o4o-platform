/**
 * FAQ Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const FAQSchema: ComponentDefinition = {
  type: 'FAQ',
  label: 'FAQ Item',
  category: 'marketing',
  icon: '❓',
  description: 'FAQ with collapsible answer',
  allowsChildren: false,
  defaultProps: {
    question: 'What is your return policy?',
    answer: 'We offer a 30-day money-back guarantee on all purchases.',
    defaultOpen: false,
  },
  inspectorConfig: [
    {
      name: 'question',
      label: 'Question',
      type: 'text',
      required: true,
      placeholder: 'What is your return policy?',
    },
    {
      name: 'answer',
      label: 'Answer',
      type: 'textarea',
      required: true,
      placeholder: 'We offer a 30-day money-back guarantee...',
      rows: 4,
    },
    {
      name: 'defaultOpen',
      label: 'Open by Default',
      type: 'boolean',
      defaultValue: false,
    },
  ],
};

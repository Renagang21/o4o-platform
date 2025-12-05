/**
 * Accordion Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const AccordionSchema: ComponentDefinition = {
  type: 'Accordion',
  label: 'Accordion',
  category: 'layout',
  icon: '▼',
  description: 'Collapsible accordion item',
  allowsChildren: false,
  defaultProps: {
    title: 'Accordion Title',
    content: 'Accordion content goes here.',
    defaultOpen: false,
    bordered: true,
  },
  inspectorConfig: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      defaultValue: 'Accordion Title',
    },
    {
      name: 'content',
      label: 'Content',
      type: 'textarea',
      required: true,
      defaultValue: 'Accordion content goes here.',
      rows: 4,
    },
    {
      name: 'defaultOpen',
      label: 'Open by Default',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'bordered',
      label: 'Show Border',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};

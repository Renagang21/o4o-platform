/**
 * CTA Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const CTASchema: ComponentDefinition = {
  type: 'CTA',
  label: 'Call to Action',
  category: 'marketing',
  icon: '📣',
  description: 'Call-to-action section with buttons',
  allowsChildren: false,
  defaultProps: {
    title: 'Ready to Get Started?',
    description: 'Join thousands of satisfied customers today.',
    primaryButtonText: 'Get Started',
    primaryButtonHref: '#',
    secondaryButtonText: 'Learn More',
    secondaryButtonHref: '#',
    bgColor: '#3b82f6',
    textColor: '#ffffff',
    layout: 'center',
  },
  inspectorConfig: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      placeholder: 'Ready to Get Started?',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Describe your call to action',
      rows: 2,
    },
    {
      name: 'primaryButtonText',
      label: 'Primary Button Text',
      type: 'text',
      required: true,
      placeholder: 'Get Started',
    },
    {
      name: 'primaryButtonHref',
      label: 'Primary Button URL',
      type: 'text',
      placeholder: '#',
    },
    {
      name: 'secondaryButtonText',
      label: 'Secondary Button Text',
      type: 'text',
      placeholder: 'Learn More',
    },
    {
      name: 'secondaryButtonHref',
      label: 'Secondary Button URL',
      type: 'text',
      placeholder: '#',
    },
    {
      name: 'layout',
      label: 'Layout',
      type: 'select',
      options: [
        { value: 'center', label: 'Center' },
        { value: 'left', label: 'Left' },
        { value: 'split', label: 'Split (Text | Buttons)' },
      ],
      defaultValue: 'center',
    },
    {
      name: 'bgColor',
      label: 'Background Color',
      type: 'color',
      defaultValue: '#3b82f6',
    },
    {
      name: 'textColor',
      label: 'Text Color',
      type: 'color',
      defaultValue: '#ffffff',
    },
  ],
};

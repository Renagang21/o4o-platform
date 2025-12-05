/**
 * PricingCard Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const PricingCardSchema: ComponentDefinition = {
  type: 'PricingCard',
  label: 'Pricing Card',
  category: 'marketing',
  icon: '💳',
  description: 'Pricing card with plan details',
  allowsChildren: false,
  defaultProps: {
    planName: 'Basic Plan',
    price: '$9',
    period: '/month',
    description: 'Perfect for individuals',
    features: ['Feature 1', 'Feature 2', 'Feature 3'],
    buttonText: 'Get Started',
    buttonHref: '#',
    highlighted: false,
    highlightColor: '#3b82f6',
  },
  inspectorConfig: [
    {
      name: 'planName',
      label: 'Plan Name',
      type: 'text',
      required: true,
      placeholder: 'Basic Plan',
    },
    {
      name: 'price',
      label: 'Price',
      type: 'text',
      required: true,
      placeholder: '$9',
    },
    {
      name: 'period',
      label: 'Period',
      type: 'text',
      placeholder: '/month',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Perfect for individuals',
      rows: 2,
    },
    {
      name: 'buttonText',
      label: 'Button Text',
      type: 'text',
      placeholder: 'Get Started',
    },
    {
      name: 'buttonHref',
      label: 'Button URL',
      type: 'text',
      placeholder: '#',
    },
    {
      name: 'highlighted',
      label: 'Highlight This Plan',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'highlightColor',
      label: 'Highlight Color',
      type: 'color',
      defaultValue: '#3b82f6',
      helpText: 'Only applies if highlighted',
    },
  ],
};

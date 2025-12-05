/**
 * Testimonial Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const TestimonialSchema: ComponentDefinition = {
  type: 'Testimonial',
  label: 'Testimonial',
  category: 'marketing',
  icon: '💬',
  description: 'Single customer testimonial',
  allowsChildren: false,
  defaultProps: {
    quote: 'This product changed my life. Highly recommend!',
    author: 'John Doe',
    role: 'CEO',
    company: 'Acme Inc',
    avatar: '',
    rating: 5,
    layout: 'card',
  },
  inspectorConfig: [
    {
      name: 'quote',
      label: 'Quote',
      type: 'textarea',
      required: true,
      placeholder: 'Enter testimonial quote',
      rows: 3,
    },
    {
      name: 'author',
      label: 'Author',
      type: 'text',
      required: true,
      placeholder: 'John Doe',
    },
    {
      name: 'role',
      label: 'Role',
      type: 'text',
      placeholder: 'CEO',
    },
    {
      name: 'company',
      label: 'Company',
      type: 'text',
      placeholder: 'Acme Inc',
    },
    {
      name: 'avatar',
      label: 'Avatar URL',
      type: 'text',
      placeholder: 'https://...',
    },
    {
      name: 'rating',
      label: 'Rating',
      type: 'select',
      options: [
        { value: 0, label: 'No rating' },
        { value: 1, label: '1 star' },
        { value: 2, label: '2 stars' },
        { value: 3, label: '3 stars' },
        { value: 4, label: '4 stars' },
        { value: 5, label: '5 stars' },
      ],
      defaultValue: 5,
    },
    {
      name: 'layout',
      label: 'Layout',
      type: 'select',
      options: [
        { value: 'card', label: 'Card' },
        { value: 'quote', label: 'Quote' },
        { value: 'minimal', label: 'Minimal' },
      ],
      defaultValue: 'card',
    },
  ],
};

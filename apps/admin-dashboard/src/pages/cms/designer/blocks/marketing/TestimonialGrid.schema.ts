/**
 * TestimonialGrid Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const TestimonialGridSchema: ComponentDefinition = {
  type: 'TestimonialGrid',
  label: 'Testimonial Grid',
  category: 'marketing',
  icon: '💬',
  description: 'Grid layout for multiple testimonials',
  allowsChildren: true,
  defaultProps: {
    title: 'What Our Customers Say',
    subtitle: 'Hear from our satisfied customers',
    columns: 2,
    gap: 'md',
    bgColor: '#f9fafb',
  },
  inspectorConfig: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      placeholder: 'What Our Customers Say',
    },
    {
      name: 'subtitle',
      label: 'Subtitle',
      type: 'textarea',
      placeholder: 'Describe your testimonials',
      rows: 2,
    },
    {
      name: 'columns',
      label: 'Columns',
      type: 'select',
      options: [
        { value: 1, label: '1 Column' },
        { value: 2, label: '2 Columns' },
        { value: 3, label: '3 Columns' },
      ],
      defaultValue: 2,
    },
    {
      name: 'gap',
      label: 'Gap',
      type: 'select',
      options: [
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
      ],
      defaultValue: 'md',
    },
    {
      name: 'bgColor',
      label: 'Background Color',
      type: 'color',
      defaultValue: '#f9fafb',
    },
  ],
};

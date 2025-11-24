/**
 * Testimonials CPT Schema
 * Phase P0-A: Customer testimonials and reviews schema
 */

import type { CPTSchema } from '@o4o/cpt-registry';

export const testimonialsSchema: CPTSchema = {
  name: 'testimonials',
  label: 'Testimonial',
  label_plural: 'Testimonials',
  description: 'Customer testimonials and reviews',

  // ACF-style field definitions
  fields: [
    {
      name: 'customer_name',
      label: 'Customer Name',
      type: 'text',
      required: true,
      instructions: 'Name of the person giving the testimonial',
    },
    {
      name: 'customer_title',
      label: 'Customer Title',
      type: 'text',
      instructions: 'Job title or position (e.g., "CEO", "Marketing Director")',
    },
    {
      name: 'company',
      label: 'Company',
      type: 'text',
      instructions: 'Company or organization name',
    },
    {
      name: 'rating',
      label: 'Rating',
      type: 'number',
      instructions: 'Rating out of 5',
      default_value: 5,
    },
    {
      name: 'testimonial_text',
      label: 'Testimonial',
      type: 'textarea',
      required: true,
      instructions: 'The testimonial content',
    },
    {
      name: 'customer_photo',
      label: 'Customer Photo',
      type: 'image',
      instructions: 'Photo of the customer (optional)',
    },
    {
      name: 'company_logo',
      label: 'Company Logo',
      type: 'image',
      instructions: 'Company logo (optional)',
    },
    {
      name: 'featured',
      label: 'Featured Testimonial',
      type: 'true_false',
      default_value: false,
      instructions: 'Display prominently on homepage',
    },
    {
      name: 'date_received',
      label: 'Date Received',
      type: 'date_picker',
      instructions: 'When the testimonial was received',
    },
    {
      name: 'verified',
      label: 'Verified',
      type: 'true_false',
      default_value: false,
      instructions: 'Mark as verified testimonial',
    },
    {
      name: 'product_service',
      label: 'Related Product/Service',
      type: 'text',
      instructions: 'Which product or service this testimonial is about',
    },
  ],

  // Meta key whitelist
  meta: {
    allowed: [
      'customer_name',
      'customer_title',
      'company',
      'rating',
      'testimonial_text',
      'customer_photo',
      'company_logo',
      'featured',
      'date_received',
      'verified',
      'product_service',
      '_thumbnail_id',
    ],
    forbidden: [],
    allow_dynamic: false,
  },

  // Taxonomies
  taxonomies: ['testimonial_category'],

  // UI settings
  supports_featured_image: true,
  has_archive: true,
  icon: 'format_quote',

  // Access control
  capabilities: {
    create: 'create_testimonials',
    read: 'read_testimonials',
    update: 'edit_testimonials',
    delete: 'delete_testimonials',
  },

  public: true,
};

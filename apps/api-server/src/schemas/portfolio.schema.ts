/**
 * Portfolio CPT Schema
 * Phase P0-A: Portfolio/project showcase schema
 */

import type { CPTSchema } from '@o4o/cpt-registry';

export const portfolioSchema: CPTSchema = {
  name: 'portfolio',
  label: 'Portfolio',
  label_plural: 'Portfolio',
  description: 'Portfolio items and project showcases',

  // ACF-style field definitions
  fields: [
    {
      name: 'project_url',
      label: 'Project URL',
      type: 'url',
      instructions: 'External project URL (optional)',
    },
    {
      name: 'client_name',
      label: 'Client Name',
      type: 'text',
      instructions: 'Client or company name',
    },
    {
      name: 'project_date',
      label: 'Project Date',
      type: 'date_picker',
      instructions: 'Project completion date',
    },
    {
      name: 'project_type',
      label: 'Project Type',
      type: 'select',
      choices: {
        web: 'Web Development',
        mobile: 'Mobile App',
        design: 'Design',
        branding: 'Branding',
        other: 'Other',
      },
      default_value: 'web',
    },
    {
      name: 'technologies',
      label: 'Technologies Used',
      type: 'text',
      instructions: 'Comma-separated technologies (e.g., React, Node.js, AWS)',
    },
    {
      name: 'gallery',
      label: 'Project Gallery',
      type: 'gallery',
      instructions: 'Project screenshots and images',
    },
    {
      name: 'featured',
      label: 'Featured Project',
      type: 'true_false',
      default_value: false,
      instructions: 'Display as featured portfolio item',
    },
    {
      name: 'testimonial',
      label: 'Client Testimonial',
      type: 'textarea',
      instructions: 'Client feedback or testimonial',
    },
    {
      name: 'project_details',
      label: 'Project Details',
      type: 'group',
      sub_fields: [
        {
          name: 'duration',
          label: 'Duration',
          type: 'text',
          instructions: 'Project duration (e.g., "3 months")',
        },
        {
          name: 'team_size',
          label: 'Team Size',
          type: 'number',
          instructions: 'Number of team members',
        },
        {
          name: 'role',
          label: 'My Role',
          type: 'text',
          instructions: 'Your role in the project',
        },
      ],
      layout: 'block',
    },
  ],

  // Meta key whitelist
  meta: {
    allowed: [
      'project_url',
      'client_name',
      'project_date',
      'project_type',
      'technologies',
      'gallery',
      'featured',
      'testimonial',
      'project_details',
      '_thumbnail_id',
    ],
    forbidden: [],
    allow_dynamic: false,
  },

  // Taxonomies
  taxonomies: ['portfolio_category', 'portfolio_tag'],

  // UI settings
  supports_featured_image: true,
  has_archive: true,
  icon: 'portfolio',

  // Access control
  capabilities: {
    create: 'create_portfolio',
    read: 'read_portfolio',
    update: 'edit_portfolio',
    delete: 'delete_portfolio',
  },

  public: true,
};

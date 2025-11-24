/**
 * Team CPT Schema
 * Phase P0-A: Team members and staff schema
 */

import type { CPTSchema } from '@o4o/cpt-registry';

export const teamSchema: CPTSchema = {
  name: 'team',
  label: 'Team Member',
  label_plural: 'Team',
  description: 'Team members and staff profiles',

  // ACF-style field definitions
  fields: [
    {
      name: 'full_name',
      label: 'Full Name',
      type: 'text',
      required: true,
      instructions: 'Team member full name',
    },
    {
      name: 'position',
      label: 'Position',
      type: 'text',
      required: true,
      instructions: 'Job title or position',
    },
    {
      name: 'department',
      label: 'Department',
      type: 'select',
      choices: {
        executive: 'Executive',
        engineering: 'Engineering',
        design: 'Design',
        marketing: 'Marketing',
        sales: 'Sales',
        support: 'Support',
        hr: 'Human Resources',
        other: 'Other',
      },
      instructions: 'Department or team',
    },
    {
      name: 'bio',
      label: 'Biography',
      type: 'textarea',
      instructions: 'Short biography or description',
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      instructions: 'Contact email address',
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'text',
      instructions: 'Contact phone number',
    },
    {
      name: 'profile_photo',
      label: 'Profile Photo',
      type: 'image',
      instructions: 'Team member photo',
    },
    {
      name: 'social_links',
      label: 'Social Media Links',
      type: 'group',
      sub_fields: [
        {
          name: 'linkedin',
          label: 'LinkedIn',
          type: 'url',
        },
        {
          name: 'twitter',
          label: 'Twitter',
          type: 'url',
        },
        {
          name: 'github',
          label: 'GitHub',
          type: 'url',
        },
        {
          name: 'website',
          label: 'Personal Website',
          type: 'url',
        },
      ],
      layout: 'block',
    },
    {
      name: 'skills',
      label: 'Skills',
      type: 'text',
      instructions: 'Comma-separated skills (e.g., "React, Node.js, AWS")',
    },
    {
      name: 'display_order',
      label: 'Display Order',
      type: 'number',
      default_value: 0,
      instructions: 'Order to display on team page (lower numbers first)',
    },
    {
      name: 'featured',
      label: 'Featured Member',
      type: 'true_false',
      default_value: false,
      instructions: 'Display prominently',
    },
    {
      name: 'hire_date',
      label: 'Hire Date',
      type: 'date_picker',
      instructions: 'Date joined the team',
    },
  ],

  // Meta key whitelist
  meta: {
    allowed: [
      'full_name',
      'position',
      'department',
      'bio',
      'email',
      'phone',
      'profile_photo',
      'social_links',
      'skills',
      'display_order',
      'featured',
      'hire_date',
      '_thumbnail_id',
    ],
    forbidden: [],
    allow_dynamic: false,
  },

  // Taxonomies
  taxonomies: ['team_category'],

  // UI settings
  supports_featured_image: true,
  has_archive: true,
  icon: 'people',

  // Access control
  capabilities: {
    create: 'create_team',
    read: 'read_team',
    update: 'edit_team',
    delete: 'delete_team',
  },

  public: true,
};

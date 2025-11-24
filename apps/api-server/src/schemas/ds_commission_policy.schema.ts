/**
 * DS Commission Policy CPT Schema
 * Phase P0-A: Commission policy configuration schema
 */

import type { CPTSchema } from '@o4o/cpt-registry';

export const dsCommissionPolicySchema: CPTSchema = {
  name: 'ds_commission_policy',
  label: 'Commission Policy',
  label_plural: 'Commission Policies',
  description: 'Commission rate policies for products/categories',

  // ACF-style field definitions
  fields: [
    {
      name: 'policy_name',
      label: 'Policy Name',
      type: 'text',
      required: true,
      instructions: 'Descriptive name for this policy',
    },
    {
      name: 'policy_type',
      label: 'Policy Type',
      type: 'select',
      choices: {
        default: 'Default Policy',
        category: 'Category-based',
        product: 'Product-specific',
        partner: 'Partner-specific',
      },
      default_value: 'default',
    },
    {
      name: 'commission_structure',
      label: 'Commission Structure',
      type: 'group',
      sub_fields: [
        {
          name: 'type',
          label: 'Commission Type',
          type: 'select',
          choices: {
            percentage: 'Percentage of Sale',
            fixed: 'Fixed Amount',
            tiered: 'Tiered (based on volume)',
          },
          default_value: 'percentage',
        },
        {
          name: 'rate',
          label: 'Commission Rate',
          type: 'number',
          instructions: 'Percentage (0-100) or fixed amount',
          required: true,
        },
        {
          name: 'min_commission',
          label: 'Minimum Commission',
          type: 'number',
          instructions: 'Minimum commission amount (optional)',
        },
        {
          name: 'max_commission',
          label: 'Maximum Commission',
          type: 'number',
          instructions: 'Maximum commission amount (optional)',
        },
      ],
      layout: 'block',
    },
    {
      name: 'tiered_rates',
      label: 'Tiered Commission Rates',
      type: 'repeater',
      sub_fields: [
        {
          name: 'tier_name',
          label: 'Tier Name',
          type: 'text',
          required: true,
        },
        {
          name: 'min_sales',
          label: 'Minimum Sales Volume',
          type: 'number',
          required: true,
        },
        {
          name: 'max_sales',
          label: 'Maximum Sales Volume',
          type: 'number',
        },
        {
          name: 'rate',
          label: 'Commission Rate (%)',
          type: 'number',
          required: true,
        },
      ],
      min: 0,
      max: 10,
      layout: 'table',
      button_label: 'Add Tier',
      instructions: 'Only used when Commission Type is "Tiered"',
    },
    {
      name: 'applies_to',
      label: 'Applies To',
      type: 'group',
      sub_fields: [
        {
          name: 'product_categories',
          label: 'Product Categories',
          type: 'text',
          instructions: 'Comma-separated category IDs (if category-based)',
        },
        {
          name: 'specific_products',
          label: 'Specific Products',
          type: 'text',
          instructions: 'Comma-separated product IDs (if product-specific)',
        },
        {
          name: 'partner_ids',
          label: 'Partner IDs',
          type: 'text',
          instructions: 'Comma-separated partner IDs (if partner-specific)',
        },
      ],
      layout: 'block',
    },
    {
      name: 'validity_period',
      label: 'Validity Period',
      type: 'group',
      sub_fields: [
        {
          name: 'start_date',
          label: 'Start Date',
          type: 'date_picker',
          instructions: 'Policy effective from',
        },
        {
          name: 'end_date',
          label: 'End Date',
          type: 'date_picker',
          instructions: 'Policy expires on (optional)',
        },
      ],
      layout: 'block',
    },
    {
      name: 'status',
      label: 'Policy Status',
      type: 'select',
      choices: {
        active: 'Active',
        inactive: 'Inactive',
        draft: 'Draft',
        expired: 'Expired',
      },
      default_value: 'draft',
    },
    {
      name: 'priority',
      label: 'Priority',
      type: 'number',
      default_value: 0,
      instructions: 'Higher priority policies override lower ones',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      instructions: 'Detailed description of this policy',
    },
    {
      name: 'terms_conditions',
      label: 'Terms & Conditions',
      type: 'textarea',
      instructions: 'Terms and conditions for this policy',
    },
  ],

  // Meta key whitelist
  meta: {
    allowed: [
      'policy_name',
      'policy_type',
      'commission_structure',
      'tiered_rates',
      'applies_to',
      'validity_period',
      'status',
      'priority',
      'description',
      'terms_conditions',
      '_thumbnail_id',
    ],
    forbidden: [],
    allow_dynamic: false,
  },

  // Taxonomies
  taxonomies: [],

  // UI settings
  supports_featured_image: false,
  has_archive: false,
  icon: 'percent',

  // Access control
  capabilities: {
    create: 'create_commission_policies',
    read: 'read_commission_policies',
    update: 'edit_commission_policies',
    delete: 'delete_commission_policies',
  },

  public: false, // Admin-only
};

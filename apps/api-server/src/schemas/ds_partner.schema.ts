/**
 * DS Partner CPT Schema
 * Phase P0-A: Dropshipping partner/affiliate schema
 */

import type { CPTSchema } from '@o4o/cpt-registry';

export const dsPartnerSchema: CPTSchema = {
  name: 'ds_partner',
  label: 'Partner',
  label_plural: 'Partners',
  description: 'Dropshipping partners and affiliates in the platform',

  // ACF-style field definitions
  fields: [
    {
      name: 'partner_code',
      label: 'Partner Code',
      type: 'text',
      required: true,
      instructions: 'Unique partner identifier',
    },
    {
      name: 'partner_type',
      label: 'Partner Type',
      type: 'select',
      choices: {
        affiliate: 'Affiliate',
        reseller: 'Reseller',
        distributor: 'Distributor',
      },
      default_value: 'affiliate',
    },
    {
      name: 'company_name',
      label: 'Company Name',
      type: 'text',
      instructions: 'Company or business name (if applicable)',
    },
    {
      name: 'contact_person',
      label: 'Contact Person',
      type: 'text',
      required: true,
      instructions: 'Primary contact person name',
    },
    {
      name: 'contact_email',
      label: 'Contact Email',
      type: 'email',
      required: true,
      instructions: 'Primary contact email',
    },
    {
      name: 'contact_phone',
      label: 'Contact Phone',
      type: 'text',
      instructions: 'Contact phone number',
    },
    {
      name: 'referral_code',
      label: 'Referral Code',
      type: 'text',
      required: true,
      instructions: 'Unique referral/tracking code',
    },
    {
      name: 'commission_settings',
      label: 'Commission Settings',
      type: 'group',
      sub_fields: [
        {
          name: 'commission_type',
          label: 'Commission Type',
          type: 'select',
          choices: {
            percentage: 'Percentage',
            fixed: 'Fixed Amount',
          },
          default_value: 'percentage',
        },
        {
          name: 'commission_rate',
          label: 'Commission Rate/Amount',
          type: 'number',
          instructions: 'Commission percentage (0-100) or fixed amount',
          default_value: 0,
        },
        {
          name: 'tier',
          label: 'Partner Tier',
          type: 'select',
          choices: {
            bronze: 'Bronze',
            silver: 'Silver',
            gold: 'Gold',
            platinum: 'Platinum',
          },
          default_value: 'bronze',
        },
      ],
      layout: 'block',
    },
    {
      name: 'payment_info',
      label: 'Payment Information',
      type: 'group',
      sub_fields: [
        {
          name: 'payment_method',
          label: 'Payment Method',
          type: 'select',
          choices: {
            bank_transfer: 'Bank Transfer',
            paypal: 'PayPal',
            other: 'Other',
          },
          default_value: 'bank_transfer',
        },
        {
          name: 'bank_name',
          label: 'Bank Name',
          type: 'text',
        },
        {
          name: 'account_number',
          label: 'Account Number',
          type: 'text',
        },
        {
          name: 'account_holder',
          label: 'Account Holder',
          type: 'text',
        },
      ],
      layout: 'block',
    },
    {
      name: 'status',
      label: 'Partner Status',
      type: 'select',
      choices: {
        active: 'Active',
        inactive: 'Inactive',
        pending: 'Pending Approval',
        suspended: 'Suspended',
      },
      default_value: 'pending',
    },
    {
      name: 'approved_date',
      label: 'Approval Date',
      type: 'date_picker',
      instructions: 'Date the partner was approved',
    },
    {
      name: 'performance_metrics',
      label: 'Performance Metrics',
      type: 'group',
      sub_fields: [
        {
          name: 'total_sales',
          label: 'Total Sales',
          type: 'number',
          default_value: 0,
        },
        {
          name: 'total_commission_earned',
          label: 'Total Commission Earned',
          type: 'number',
          default_value: 0,
        },
        {
          name: 'conversion_rate',
          label: 'Conversion Rate (%)',
          type: 'number',
          default_value: 0,
        },
      ],
      layout: 'block',
    },
    {
      name: 'notes',
      label: 'Internal Notes',
      type: 'textarea',
      instructions: 'Admin-only notes about this partner',
    },
  ],

  // Meta key whitelist
  meta: {
    allowed: [
      'partner_code',
      'partner_type',
      'company_name',
      'contact_person',
      'contact_email',
      'contact_phone',
      'referral_code',
      'commission_settings',
      'payment_info',
      'status',
      'approved_date',
      'performance_metrics',
      'notes',
      '_thumbnail_id',
    ],
    forbidden: [],
    allow_dynamic: false,
  },

  // Taxonomies
  taxonomies: ['partner_category'],

  // UI settings
  supports_featured_image: true,
  has_archive: false,
  icon: 'handshake',

  // Access control
  capabilities: {
    create: 'create_partners',
    read: 'read_partners',
    update: 'edit_partners',
    delete: 'delete_partners',
  },

  public: false, // Not publicly visible
};

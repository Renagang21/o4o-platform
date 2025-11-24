/**
 * DS Supplier CPT Schema
 * Phase P0-A: Dropshipping supplier schema
 */

import type { CPTSchema } from '@o4o/cpt-registry';

export const dsSupplierSchema: CPTSchema = {
  name: 'ds_supplier',
  label: 'Supplier',
  label_plural: 'Suppliers',
  description: 'Dropshipping suppliers in the platform',

  // ACF-style field definitions
  fields: [
    {
      name: 'supplier_code',
      label: 'Supplier Code',
      type: 'text',
      required: true,
      instructions: 'Unique supplier identifier',
    },
    {
      name: 'company_name',
      label: 'Company Name',
      type: 'text',
      required: true,
      instructions: 'Legal company name',
    },
    {
      name: 'business_registration',
      label: 'Business Registration Number',
      type: 'text',
      required: true,
      instructions: 'Business registration number',
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
      required: true,
      instructions: 'Primary contact phone number',
    },
    {
      name: 'address',
      label: 'Address',
      type: 'group',
      sub_fields: [
        {
          name: 'street',
          label: 'Street Address',
          type: 'text',
        },
        {
          name: 'city',
          label: 'City',
          type: 'text',
        },
        {
          name: 'state',
          label: 'State/Province',
          type: 'text',
        },
        {
          name: 'postal_code',
          label: 'Postal Code',
          type: 'text',
        },
        {
          name: 'country',
          label: 'Country',
          type: 'text',
          default_value: 'South Korea',
        },
      ],
      layout: 'block',
    },
    {
      name: 'bank_account',
      label: 'Bank Account Information',
      type: 'group',
      sub_fields: [
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
      name: 'commission_rate',
      label: 'Default Commission Rate',
      type: 'number',
      instructions: 'Default commission percentage (0-100)',
      default_value: 0,
    },
    {
      name: 'status',
      label: 'Supplier Status',
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
      name: 'verified',
      label: 'Verified',
      type: 'true_false',
      default_value: false,
      instructions: 'Business verification status',
    },
    {
      name: 'rating',
      label: 'Supplier Rating',
      type: 'number',
      instructions: 'Overall supplier rating (0-5)',
      default_value: 0,
    },
    {
      name: 'notes',
      label: 'Internal Notes',
      type: 'textarea',
      instructions: 'Admin-only notes about this supplier',
    },
  ],

  // Meta key whitelist
  meta: {
    allowed: [
      'supplier_code',
      'company_name',
      'business_registration',
      'contact_person',
      'contact_email',
      'contact_phone',
      'address',
      'bank_account',
      'commission_rate',
      'status',
      'verified',
      'rating',
      'notes',
      '_thumbnail_id',
    ],
    forbidden: [],
    allow_dynamic: false,
  },

  // Taxonomies
  taxonomies: ['supplier_category'],

  // UI settings
  supports_featured_image: true,
  has_archive: false,
  icon: 'store',

  // Access control
  capabilities: {
    create: 'create_suppliers',
    read: 'read_suppliers',
    update: 'edit_suppliers',
    delete: 'delete_suppliers',
  },

  public: false, // Not publicly visible
};

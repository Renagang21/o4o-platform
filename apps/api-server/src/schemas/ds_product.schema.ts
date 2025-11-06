/**
 * DS Product CPT Schema
 * Phase 5: Sample schema demonstrating registry usage
 */

import type { CPTSchema } from '@o4o/cpt-registry';

export const dsProductSchema: CPTSchema = {
  name: 'ds_product',
  label: 'DS Product',
  label_plural: 'DS Products',
  description: 'DS (DesignSystem) products for e-commerce',

  // ACF-style field definitions
  fields: [
    {
      name: 'price',
      label: 'Price',
      type: 'number',
      required: true,
      instructions: 'Product price in KRW',
    },
    {
      name: 'sale_price',
      label: 'Sale Price',
      type: 'number',
      instructions: 'Discounted price (optional)',
    },
    {
      name: 'sku',
      label: 'SKU',
      type: 'text',
      required: true,
      instructions: 'Stock Keeping Unit',
    },
    {
      name: 'stock_quantity',
      label: 'Stock Quantity',
      type: 'number',
      default_value: 0,
    },
    {
      name: 'stock_status',
      label: 'Stock Status',
      type: 'select',
      choices: {
        in_stock: 'In Stock',
        out_of_stock: 'Out of Stock',
        on_backorder: 'On Backorder',
      },
      default_value: 'in_stock',
    },
    {
      name: 'product_gallery',
      label: 'Product Gallery',
      type: 'gallery',
      instructions: 'Additional product images',
    },
    {
      name: 'product_specs',
      label: 'Product Specifications',
      type: 'repeater',
      sub_fields: [
        {
          name: 'spec_name',
          label: 'Specification Name',
          type: 'text',
          required: true,
        },
        {
          name: 'spec_value',
          label: 'Specification Value',
          type: 'text',
          required: true,
        },
      ],
      min: 0,
      max: 20,
      layout: 'table',
      button_label: 'Add Specification',
    },
    {
      name: 'shipping_info',
      label: 'Shipping Information',
      type: 'group',
      sub_fields: [
        {
          name: 'weight',
          label: 'Weight (kg)',
          type: 'number',
        },
        {
          name: 'dimensions',
          label: 'Dimensions',
          type: 'text',
          instructions: 'Format: L x W x H (cm)',
        },
        {
          name: 'free_shipping',
          label: 'Free Shipping',
          type: 'true_false',
          default_value: false,
        },
      ],
      layout: 'block',
    },
    {
      name: 'related_products',
      label: 'Related Products',
      type: 'relationship',
      instructions: 'Select related products',
    },
  ],

  // Meta key whitelist (only these keys allowed in post_meta)
  meta: {
    allowed: [
      'price',
      'sale_price',
      'sku',
      'stock_quantity',
      'stock_status',
      'product_gallery',
      'product_specs',
      'shipping_info',
      'related_products',
      '_thumbnail_id', // WordPress compatibility
    ],
    forbidden: [],
    allow_dynamic: false, // Strict mode: only whitelisted keys
  },

  // Taxonomies
  taxonomies: ['product_category', 'product_tag'],

  // UI settings
  supports_featured_image: true,
  has_archive: true,
  icon: 'shopping_cart',

  // Access control
  capabilities: {
    create: 'create_products',
    read: 'read_products',
    update: 'edit_products',
    delete: 'delete_products',
  },

  public: true,
};

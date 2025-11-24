/**
 * Products CPT Schema
 * Phase P0-A: Standard e-commerce product schema
 */

import type { CPTSchema } from '@o4o/cpt-registry';

export const productsSchema: CPTSchema = {
  name: 'products',
  label: 'Product',
  label_plural: 'Products',
  description: 'E-commerce products',

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
      name: 'product_type',
      label: 'Product Type',
      type: 'select',
      choices: {
        simple: 'Simple',
        variable: 'Variable',
        digital: 'Digital',
      },
      default_value: 'simple',
    },
    {
      name: 'featured',
      label: 'Featured Product',
      type: 'true_false',
      default_value: false,
      instructions: 'Display as featured product',
    },
    {
      name: 'gallery',
      label: 'Product Gallery',
      type: 'gallery',
      instructions: 'Additional product images',
    },
    {
      name: 'short_description',
      label: 'Short Description',
      type: 'textarea',
      instructions: 'Brief product description',
    },
    {
      name: 'specifications',
      label: 'Specifications',
      type: 'repeater',
      sub_fields: [
        {
          name: 'spec_name',
          label: 'Name',
          type: 'text',
          required: true,
        },
        {
          name: 'spec_value',
          label: 'Value',
          type: 'text',
          required: true,
        },
      ],
      min: 0,
      max: 30,
      layout: 'table',
      button_label: 'Add Specification',
    },
  ],

  // Meta key whitelist
  meta: {
    allowed: [
      'price',
      'sale_price',
      'sku',
      'stock_quantity',
      'stock_status',
      'product_type',
      'featured',
      'gallery',
      'short_description',
      'specifications',
      '_thumbnail_id',
    ],
    forbidden: [],
    allow_dynamic: false,
  },

  // Taxonomies
  taxonomies: ['product_category', 'product_tag'],

  // UI settings
  supports_featured_image: true,
  has_archive: true,
  icon: 'cart',

  // Access control
  capabilities: {
    create: 'create_products',
    read: 'read_products',
    update: 'edit_products',
    delete: 'delete_products',
  },

  public: true,
};

import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import { Filter } from 'lucide-react';
import { Edit } from './edit';
import { save } from './save';
import metadata from './block.json';

registerBlockType(metadata.name as any, {
  ...metadata,
  title: __('Product Filter', 'o4o'),
  description: __('Add filters for products by price, category, brand, and stock', 'o4o'),
  icon: <Filter className="w-5 h-5" />,
  category: 'o4o-ecommerce',
  keywords: ['filter', 'product', 'search', 'ecommerce'],
  example: {
    attributes: {
      showPriceFilter: true,
      showCategoryFilter: true,
      showBrandFilter: true,
      showStockFilter: true,
      showSortOptions: true,
      layout: 'sidebar'
    }
  },
  edit: Edit,
  save
} as any);
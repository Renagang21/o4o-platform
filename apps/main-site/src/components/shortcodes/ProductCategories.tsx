/**
 * Product Categories Shortcode Component
 * Displays product categories in a grid layout
 *
 * Usage: [product_categories show_count="true" hide_empty="true" columns="3"]
 */

import { FC, Suspense } from 'react';
import { ShortcodeComponentProps, ShortcodeDefinition } from '@o4o/shortcodes';
import { useCategories } from '@/hooks/useCategories';
import { FolderOpen } from 'lucide-react';

// Product Categories Wrapper
const ProductCategoriesWrapper: FC<{
  showCount: boolean;
  hideEmpty: boolean;
  columns: number;
}> = ({ showCount, hideEmpty, columns }) => {
  const { data: categoriesData, isLoading, error } = useCategories();

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-4`}>
        {[...Array(columns * 2)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-32"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !categoriesData?.data) {
    return <div className="text-gray-500">Categories not found</div>;
  }

  // Flatten nested categories
  const flattenCategories = (categories: any[]): any[] => {
    return categories.reduce((acc, cat) => {
      acc.push(cat);
      if (cat.children && cat.children.length > 0) {
        acc.push(...flattenCategories(cat.children));
      }
      return acc;
    }, []);
  };

  let categories = flattenCategories(categoriesData.data);

  // Filter empty categories if needed
  if (hideEmpty) {
    categories = categories.filter(cat => (cat.count || 0) > 0);
  }

  if (categories.length === 0) {
    return <div className="text-gray-500">No categories found</div>;
  }

  return (
    <div className="product-categories-shortcode">
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-4`}>
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1">
                <FolderOpen className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
                  )}
                </div>
              </div>
              {showCount && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  {category.count || 0}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Component (will be registered as [product_categories])
const ProductCategoriesShortcode: FC<ShortcodeComponentProps> = ({ attributes }) => {
  const showCount = attributes.show_count !== false;
  const hideEmpty = attributes.hide_empty !== false;
  const columns = Number(attributes.columns || 3);

  return (
    <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
      <ProductCategoriesWrapper
        showCount={showCount}
        hideEmpty={hideEmpty}
        columns={columns}
      />
    </Suspense>
  );
};

/**
 * Product Categories Shortcode Definition
 */
export const productCategoriesShortcodes: ShortcodeDefinition[] = [
  {
    name: 'product_categories',
    component: ProductCategoriesShortcode,
    description: 'Product categories grid with counts and filtering',
    attributes: [
      {
        name: 'show_count',
        type: 'boolean',
        description: 'Show product count per category (default: true)',
      },
      {
        name: 'hide_empty',
        type: 'boolean',
        description: 'Hide categories with no products (default: true)',
      },
      {
        name: 'columns',
        type: 'number',
        description: 'Number of columns in grid (default: 3)',
      },
    ],
  },
];

export default ProductCategoriesShortcode;

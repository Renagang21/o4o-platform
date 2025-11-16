/**
 * Product Grid Shortcode Component
 * Displays products in a responsive grid layout
 *
 * Usage: [product_grid category="electronics" limit="8" columns="4"]
 */

import { FC, Suspense } from 'react';
import { ShortcodeComponentProps } from '@o4o/shortcodes';
import { useProducts } from '@/hooks/useProducts';

// Placeholder ProductGrid component
const ProductGrid: FC<{ products: any[]; columns: number }> = ({ products, columns }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
    {products.map((product, i) => (
      <div key={i} className="border rounded-lg p-4">
        <h3>{product.name}</h3>
        <p>{product.price}</p>
      </div>
    ))}
  </div>
);

// Loading component
const ProductLoading = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 rounded-lg h-64 w-full"></div>
    <div className="mt-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  </div>
);

// Grid Loading Component
const GridLoading: FC<{ columns: number }> = ({ columns }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
    {[...Array(columns * 2)].map((_, i) => (
      <ProductLoading key={i} />
    ))}
  </div>
);

// Product Grid Wrapper
const ProductGridWrapper: FC<{
  category?: string;
  limit: number;
  columns: number;
  featured?: boolean;
  orderBy: string;
  order: 'asc' | 'desc';
}> = ({ category, limit, columns, featured, orderBy, order }) => {
  const filters = {
    category,
    featured,
    status: 'active' as const
  };

  const { data: productsData, isLoading, error } = useProducts(1, limit, filters);

  if (isLoading) return <GridLoading columns={columns} />;
  if (error || !productsData?.data) return <div className="text-gray-500">Products not found</div>;

  // Sort products based on orderBy and order
  let products = [...productsData.data];
  products.sort((a, b) => {
    let aVal, bVal;

    switch (orderBy) {
      case 'price':
        aVal = a.price;
        bVal = b.price;
        break;
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'created_at':
      default:
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
        break;
    }

    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  return <ProductGrid products={products} columns={columns} />;
};

// Main Component (will be registered as [product_grid])
const ProductGridShortcode: FC<ShortcodeComponentProps> = ({ attributes }) => {
  const category = String(attributes.category || '');
  const limit = Number(attributes.limit || 12);
  const columns = Number(attributes.columns || 4);
  const featured = attributes.featured === true;
  const orderBy = String(attributes.orderby || 'created_at');
  const order = String(attributes.order || 'desc') as 'asc' | 'desc';

  return (
    <Suspense fallback={<GridLoading columns={columns} />}>
      <ProductGridWrapper
        category={category}
        limit={limit}
        columns={columns}
        featured={featured}
        orderBy={orderBy}
        order={order}
      />
    </Suspense>
  );
};

export default ProductGridShortcode;

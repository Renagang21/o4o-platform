/**
 * Featured Products Shortcode Component
 * Displays featured/recommended products in a grid
 *
 * Usage: [featured_products limit="4" columns="4" title="추천 상품"]
 */

import { FC, Suspense } from 'react';
import { ShortcodeComponentProps, ShortcodeDefinition } from '@o4o/shortcodes';
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
  featured: boolean;
  limit: number;
  columns: number;
  orderBy: string;
  order: 'asc' | 'desc';
}> = ({ featured, limit, columns, orderBy, order }) => {
  const filters = {
    featured,
    status: 'active' as const
  };

  const { data: productsData, isLoading, error } = useProducts(1, limit, filters);

  if (isLoading) return <GridLoading columns={columns} />;
  if (error || !productsData?.data) return <div className="text-gray-500">Products not found</div>;

  // Sort products
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

// Main Component (will be registered as [featured_products])
const FeaturedProductsShortcode: FC<ShortcodeComponentProps> = ({ attributes }) => {
  const limit = Number(attributes.limit || 4);
  const columns = Number(attributes.columns || 4);
  const title = String(attributes.title || '추천 상품');

  return (
    <div className="featured-products-shortcode">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      <Suspense fallback={<GridLoading columns={columns} />}>
        <ProductGridWrapper
          featured={true}
          limit={limit}
          columns={columns}
          orderBy="created_at"
          order="desc"
        />
      </Suspense>
    </div>
  );
};

/**
 * Featured Products Shortcode Definition
 */
export const featuredProductsShortcodes: ShortcodeDefinition[] = [
  {
    name: 'featured_products',
    component: FeaturedProductsShortcode,
    description: 'Featured products grid with configurable layout',
    attributes: [
      {
        name: 'limit',
        type: 'number',
        description: 'Number of featured products to display (default: 4)',
      },
      {
        name: 'columns',
        type: 'number',
        description: 'Number of columns in grid (default: 4)',
      },
      {
        name: 'title',
        type: 'string',
        description: 'Section title (default: "추천 상품")',
      },
    ],
  },
];

export default FeaturedProductsShortcode;

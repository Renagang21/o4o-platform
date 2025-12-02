/**
 * Product Carousel Shortcode Component
 * Displays products in a horizontal scrollable carousel
 *
 * Usage: [product_carousel category="new-arrivals" limit="10" title="신상품"]
 */

import { FC, Suspense } from 'react';
import { ShortcodeComponentProps, ShortcodeDefinition } from '@o4o/shortcodes';
import { useProducts } from '@/hooks/useProducts';

// Placeholder ProductCarousel component
const ProductCarousel: FC<{ products: any[]; autoplay: boolean }> = ({ products }) => (
  <div className="flex overflow-x-auto gap-4">
    {products.map((product, i) => (
      <div key={i} className="min-w-[250px] border rounded-lg p-4">
        <h3>{product.name}</h3>
        <p>{product.price}</p>
      </div>
    ))}
  </div>
);

// Product Carousel Wrapper
const ProductCarouselWrapper: FC<{
  category?: string;
  limit: number;
  autoplay: boolean;
  title?: string;
}> = ({ category, limit, autoplay, title }) => {
  const filters = {
    category,
    status: 'active' as const
  };

  const { data: productsData, isLoading, error } = useProducts(1, limit, filters);

  if (isLoading) return <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />;
  if (error || !productsData?.data || productsData.data.length === 0) {
    return <div className="text-gray-500">No products found for carousel</div>;
  }

  return (
    <div className="product-carousel-shortcode">
      {title && <h2 className="text-2xl font-bold mb-6">{title}</h2>}
      <ProductCarousel products={productsData.data} autoplay={autoplay} />
    </div>
  );
};

// Main Component (will be registered as [product_carousel])
const ProductCarouselShortcode: FC<ShortcodeComponentProps> = ({ attributes }) => {
  const category = String(attributes.category || '');
  const limit = Number(attributes.limit || 10);
  const autoplay = attributes.autoplay !== false;
  const title = String(attributes.title || '');

  return (
    <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
      <ProductCarouselWrapper
        category={category}
        limit={limit}
        autoplay={autoplay}
        title={title}
      />
    </Suspense>
  );
};

/**
 * Product Carousel Shortcode Definition
 */
export const productCarouselShortcodes: ShortcodeDefinition[] = [
  {
    name: 'product_carousel',
    component: ProductCarouselShortcode,
    description: 'Product carousel with horizontal scrolling and autoplay',
    attributes: [
      {
        name: 'category',
        type: 'string',
        description: 'Filter products by category',
      },
      {
        name: 'limit',
        type: 'number',
        description: 'Number of products to display (default: 10)',
      },
      {
        name: 'autoplay',
        type: 'boolean',
        description: 'Enable auto-scrolling (default: true)',
      },
      {
        name: 'title',
        type: 'string',
        description: 'Carousel section title',
      },
    ],
  },
];

export default ProductCarouselShortcode;

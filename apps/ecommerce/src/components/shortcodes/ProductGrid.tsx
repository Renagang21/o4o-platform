import { FC } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { formatCurrency } from '@o4o/utils';
import type { ShortcodeProps, ShortcodeDefinition } from '@o4o/shortcodes';

interface ProductGridProps {
  category?: string;
  limit?: number;
  sort?: 'price-asc' | 'price-desc' | 'name' | 'newest';
  columns?: number;
  showPrice?: boolean;
  showRating?: boolean;
}

const ProductGridComponent: FC<ProductGridProps> = ({
  category,
  limit = 12,
  sort = 'newest',
  columns = 4,
  showPrice = true,
  showRating = true
}) => {
  const { data, isLoading, error } = useProducts({
    category,
    limit,
    sortBy: sort === 'price-asc' || sort === 'price-desc' ? 'price' : sort === 'name' ? 'name' : 'created',
    sortOrder: sort === 'price-asc' ? 'asc' : 'desc'
  });

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    6: 'grid-cols-6'
  }[columns] || 'grid-cols-4';

  if (isLoading) return <div className="text-center py-8">Loading products...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error loading products</div>;
  if (!data?.products || data.products.length === 0) return <div className="text-center py-8">No products found</div>;

  const products = data.products;

  return (
    <div className={`grid ${gridCols} gap-6`}>
      {products.map((product) => (
        <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <Link to={`/products/${product.slug}`}>
            {product.images?.[0] && (
              <img
                src={typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
              
              {showPrice && (
                <div className="text-xl font-bold text-blue-600 mb-2">
                  {formatCurrency(product.pricing.customer)}
                </div>
              )}
              
              {showRating && product.rating && (
                <div className="flex items-center">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(product.rating!) ? 'fill-current' : 'stroke-current'}`}
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">
                    ({product.reviewCount || 0})
                  </span>
                </div>
              )}
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
};

// Wrapper component that accepts ShortcodeProps
export const ProductGrid: FC<ShortcodeProps> = ({ attributes }) => {
  const props: ProductGridProps = {
    category: attributes.category as string,
    limit: attributes.limit ? Number(attributes.limit) : undefined,
    sort: attributes.sort as 'price-asc' | 'price-desc' | 'name' | 'newest',
    columns: attributes.columns ? Number(attributes.columns) : undefined,
    showPrice: attributes.showPrice !== false,
    showRating: attributes.showRating !== false
  };

  return <ProductGridComponent {...props} />;
};

export const productGridDefinition: ShortcodeDefinition = {
  name: 'product-grid',
  component: ProductGrid,
  attributes: {
    category: { type: 'string' },
    limit: { type: 'number' },
    sort: { type: 'string' },
    columns: { type: 'number' },
    showPrice: { type: 'boolean' },
    showRating: { type: 'boolean' }
  }
};
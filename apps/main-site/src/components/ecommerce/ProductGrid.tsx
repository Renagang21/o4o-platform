import { FC } from 'react';
import { Product } from '@/types/ecommerce';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Package, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProductGridProps {
  products: Product[];
  columns?: number;
}

const ProductGrid: FC<ProductGridProps> = ({ products, columns = 4 }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-6',
  }[columns] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';

  return (
    <div className={`grid ${gridCols} gap-6`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

const ProductCard: FC<{ product: Product }> = ({ product }) => {
  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <div className="group relative">
      <Link to={`/products/${product.slug || product.id}`} className="block">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-all duration-200">
          {/* Image */}
          <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200 relative">
            {product.images && product.images[0] ? (
              <img
                src={product.images[0].url}
                alt={product.name}
                className="object-cover object-center w-full h-full group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="w-12 h-12 text-gray-400" />
              </div>
            )}
            
            {/* Badges */}
            <div className="absolute top-2 left-2 space-y-2">
              {product.featured && (
                <span className="inline-block px-2 py-1 text-xs font-medium bg-yellow-400 text-yellow-900 rounded">
                  추천
                </span>
              )}
              {discount > 0 && (
                <span className="inline-block px-2 py-1 text-xs font-medium bg-red-500 text-white rounded">
                  {discount}% 할인
                </span>
              )}
              {product.stockQuantity === 0 && (
                <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-500 text-white rounded">
                  품절
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
              {product.name}
            </h3>

            {/* Rating */}
            {product.rating && (
              <div className="flex items-center mb-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.rating!)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500 ml-1">
                  ({product.reviewCount || 0})
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(product.price)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="text-sm text-gray-500 line-through ml-2">
                    {formatCurrency(product.compareAtPrice)}
                  </span>
                )}
              </div>

              {/* Quick Add to Cart */}
              {product.stockQuantity > 0 && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    // TODO: Add to cart functionality
                    // console.log('Add to cart:', product.id);
                  }}
                  className="p-2 bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="장바구니에 담기"
                >
                  <ShoppingCart className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductGrid;
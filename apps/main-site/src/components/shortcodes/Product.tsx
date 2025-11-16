/**
 * Product Shortcode Component
 * Renders a single product with customizable display options
 *
 * Usage: [product id="123" show_price="true" show_cart="true"]
 */

import { FC } from 'react';
import { ShortcodeComponentProps } from '@o4o/shortcodes';
import { useProduct } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Package } from 'lucide-react';

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

// Single Product Component
const SingleProduct: FC<{
  productId: string;
  showPrice?: boolean;
  showCart?: boolean;
  className?: string;
}> = ({ productId, showPrice = true, showCart = true, className = '' }) => {
  const { data: productData, isLoading, error } = useProduct(productId);

  if (isLoading) return <ProductLoading />;
  if (error || !productData?.data) return <div className="text-gray-500">Product not found</div>;

  const product = productData.data;

  return (
    <div className={`product-shortcode ${className}`}>
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200">
          {product.images && product.images[0] ? (
            <img
              src={product.images[0].url}
              alt={product.name}
              className="object-cover object-center w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{product.name}</h3>

          {product.shortDescription && (
            <p className="text-sm text-gray-600 mb-3">{product.shortDescription}</p>
          )}

          <div className="flex items-center justify-between">
            {showPrice && (
              <div>
                <span className="text-xl font-semibold text-gray-900">
                  {formatCurrency(product.price)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="text-sm text-gray-500 line-through ml-2">
                    {formatCurrency(product.compareAtPrice)}
                  </span>
                )}
              </div>
            )}

            {showCart && product.stockQuantity > 0 && (
              <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <ShoppingCart className="w-4 h-4 mr-2" />
                장바구니
              </button>
            )}
          </div>

          {product.stockQuantity === 0 && (
            <div className="mt-2 text-red-600 text-sm font-medium">품절</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Component (will be registered as [product])
const ProductShortcode: FC<ShortcodeComponentProps> = ({ attributes }) => {
  const productId = String(attributes.id || '');
  const showPrice = attributes.show_price !== false;
  const showCart = attributes.show_cart !== false;
  const className = String(attributes.class || '');

  if (!productId) {
    return <div className="text-red-500">Product shortcode requires an ID</div>;
  }

  return <SingleProduct
    productId={productId}
    showPrice={showPrice}
    showCart={showCart}
    className={className}
  />;
};

export default ProductShortcode;

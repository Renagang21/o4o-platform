/**
 * Add to Cart Button Shortcode Component
 * Renders an add-to-cart button for a specific product
 *
 * Usage: [add_to_cart id="123" text="구매하기" show_price="true"]
 */

import { FC } from 'react';
import { ShortcodeComponentProps } from '@o4o/shortcodes';
import { useProduct } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart } from 'lucide-react';

// Add to Cart Button Component
const AddToCartButton: FC<{
  productId: string;
  text: string;
  className?: string;
  showPrice?: boolean;
}> = ({ productId, text, className = '', showPrice = true }) => {
  const { data: productData, isLoading } = useProduct(productId);

  if (isLoading) {
    return (
      <button className="px-4 py-2 bg-gray-200 rounded-lg animate-pulse" disabled>
        Loading...
      </button>
    );
  }

  if (!productData?.data) return null;

  const product = productData.data;
  const isOutOfStock = product.stockQuantity === 0;

  return (
    <div className={`add-to-cart-shortcode inline-block ${className}`}>
      <button
        className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
          isOutOfStock
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        disabled={isOutOfStock}
      >
        <ShoppingCart className="w-5 h-5 mr-2" />
        {isOutOfStock ? '품절' : text}
        {showPrice && !isOutOfStock && (
          <span className="ml-2 font-semibold">{formatCurrency(product.price)}</span>
        )}
      </button>
    </div>
  );
};

// Main Component (will be registered as [add_to_cart])
const AddToCartShortcode: FC<ShortcodeComponentProps> = ({ attributes }) => {
  const productId = String(attributes.id || '');
  const text = String(attributes.text || '장바구니에 담기');
  const className = String(attributes.class || '');
  const showPrice = attributes.show_price !== false;

  if (!productId) {
    return <div className="text-red-500">Add to cart shortcode requires a product ID</div>;
  }

  return <AddToCartButton
    productId={productId}
    text={text}
    className={className}
    showPrice={showPrice}
  />;
};

export default AddToCartShortcode;

import { ShoppingCart, Heart, Eye, Package } from 'lucide-react';
import { __ } from '@wordpress/i18n';
import { formatPrice, calculateDiscountPercentage } from '../../../../utils/ecommerce';

interface ProductCardTemplateProps {
  products: any[];
  attributes: any;
  isLoading: boolean;
  error?: string;
}

export function ProductCardTemplate({ products, attributes, isLoading, error }: ProductCardTemplateProps) {
  const {
    columns = 3,
    showImage = true,
    imageSize = 'medium',
    showTitle = true,
    showPrice = true,
    showRegularPrice = true,
    showSalePrice = true,
    showStock = true,
    showAddToCart = true,
    showQuickView = false,
    showWishlist = false,
    showSaleBadge = true,
    showCategories = false,
    showRating = false,
    cardStyle = 'shadow',
    imageAspectRatio = 'square',
    priceColor,
    salePriceColor = '#e74c3c',
    buttonColor,
    buttonTextColor
  } = attributes;

  if (isLoading) {
    return (
      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {[...Array(columns * 2)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg" style={{ paddingBottom: imageAspectRatio === 'square' ? '100%' : imageAspectRatio === 'portrait' ? '133%' : imageAspectRatio === 'landscape' ? '75%' : '56.25%' }}></div>
            <div className="mt-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{error}</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{__('No products found', 'o4o')}</p>
      </div>
    );
  }

  const getCardClasses = () => {
    const baseClasses = 'group relative overflow-hidden rounded-lg transition-all duration-300';
    const styleClasses = {
      shadow: 'shadow-md hover:shadow-xl',
      border: 'border border-gray-200 hover:border-gray-300',
      minimal: '',
      elevated: 'shadow-lg hover:shadow-2xl hover:-translate-y-1'
    };
    return `${baseClasses} ${(styleClasses as any)[cardStyle] || styleClasses.shadow}`;
  };

  const getAspectRatioStyle = () => {
    const ratios = {
      square: 'pb-[100%]',
      portrait: 'pb-[133%]',
      landscape: 'pb-[75%]',
      wide: 'pb-[56.25%]'
    };
    return (ratios as any)[imageAspectRatio] || ratios.square;
  };

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {products.map((product: any) => {
        const isOnSale = product.salePrice && product.salePrice < product.regularPrice;
        const discountPercentage = isOnSale ? calculateDiscountPercentage(product.regularPrice, product.salePrice) : 0;

        return (
          <article key={product.id} className={getCardClasses()}>
            {showImage && (
              <div className="relative overflow-hidden bg-gray-100">
                <div className={`relative ${getAspectRatioStyle()}`}>
                  <img
                    src={product.image?.[imageSize] || product.image?.full || '/placeholder-product.jpg'}
                    alt={product.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  
                  {/* Sale Badge */}
                  {showSaleBadge && isOnSale && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 text-xs font-bold rounded">
                      -{discountPercentage}%
                    </div>
                  )}

                  {/* Stock Badge */}
                  {showStock && product.stockStatus === 'out_of_stock' && (
                    <div className="absolute top-2 right-2 bg-gray-800 text-white px-2 py-1 text-xs font-bold rounded">
                      {__('Out of Stock', 'o4o')}
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                      {showQuickView && (
                        <button
                          className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                          aria-label={__('Quick View', 'o4o')}
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      )}
                      {showWishlist && (
                        <button
                          className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                          aria-label={__('Add to Wishlist', 'o4o')}
                        >
                          <Heart className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4">
              {/* Categories */}
              {showCategories && product.categories?.length > 0 && (
                <div className="text-xs text-gray-500 mb-2">
                  {product.categories.map((cat: any) => cat.name).join(', ')}
                </div>
              )}

              {/* Title */}
              {showTitle && (
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  <a href={product.link} className="hover:text-blue-600 transition-colors">
                    {product.title}
                  </a>
                </h3>
              )}

              {/* Rating */}
              {showRating && product.averageRating > 0 && (
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`text-sm ${i < Math.floor(product.averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">({product.ratingCount})</span>
                </div>
              )}

              {/* Price */}
              {showPrice && (
                <div className="mb-3">
                  {isOnSale && showSalePrice ? (
                    <div className="flex items-center gap-2">
                      {showRegularPrice && (
                        <span className="text-sm text-gray-500 line-through">
                          {formatPrice(product.regularPrice, product.currency)}
                        </span>
                      )}
                      <span 
                        className="text-lg font-bold"
                        style={{ color: salePriceColor }}
                      >
                        {formatPrice(product.salePrice, product.currency)}
                      </span>
                    </div>
                  ) : (
                    <span 
                      className="text-lg font-bold"
                      style={{ color: priceColor }}
                    >
                      {formatPrice(product.regularPrice || product.price, product.currency)}
                    </span>
                  )}
                </div>
              )}

              {/* Stock Status */}
              {showStock && product.stockStatus === 'in_stock' && product.stockQuantity && (
                <p className="text-sm text-green-600 mb-3">
                  {product.stockQuantity} {__('in stock', 'o4o')}
                </p>
              )}

              {/* Add to Cart Button */}
              {showAddToCart && (
                <button
                  className="w-full py-2 px-4 rounded-md font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: buttonColor || '#2563eb',
                    color: buttonTextColor || '#ffffff'
                  }}
                  disabled={product.stockStatus === 'out_of_stock'}
                  data-product-id={product.id}
                  data-product-type={product.type}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {product.stockStatus === 'out_of_stock' 
                    ? __('Out of Stock', 'o4o')
                    : __('Add to Cart', 'o4o')
                  }
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
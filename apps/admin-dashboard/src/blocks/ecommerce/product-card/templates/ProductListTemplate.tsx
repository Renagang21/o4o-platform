import { ShoppingCart, Package, Star } from 'lucide-react';
import { __ } from '@wordpress/i18n';
import { formatPrice, calculateDiscountPercentage } from '../../../../utils/ecommerce';

interface ProductListTemplateProps {
  products: any[];
  attributes: any;
  isLoading: boolean;
  error?: string;
}

export function ProductListTemplate({ products, attributes, isLoading, error }: ProductListTemplateProps) {
  const {
    showImage = true,
    imageSize = 'thumbnail',
    showTitle = true,
    showPrice = true,
    showRegularPrice = true,
    showSalePrice = true,
    showStock = true,
    showAddToCart = true,
    showCategories = false,
    showRating = false,
    showDescription = true,
    priceColor,
    salePriceColor = '#e74c3c',
    buttonColor,
    buttonTextColor
  } = attributes;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="flex gap-4 p-4 border border-gray-200 rounded-lg animate-pulse">
            <div className="w-32 h-32 bg-gray-200 rounded flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !products || products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{error || __('No products found', 'o4o')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {products.map((product) => {
        const isOnSale = product.salePrice && product.salePrice < product.regularPrice;
        const discountPercentage = isOnSale ? calculateDiscountPercentage(product.regularPrice, product.salePrice) : 0;

        return (
          <article 
            key={product.id} 
            className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            {showImage && (
              <div className="flex-shrink-0">
                <a href={product.link} className="block">
                  <img
                    src={product.image?.[imageSize] || product.image?.thumbnail || '/placeholder-product.jpg'}
                    alt={product.title}
                    className="w-32 h-32 object-cover rounded"
                  />
                </a>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  {/* Categories */}
                  {showCategories && product.categories?.length > 0 && (
                    <div className="text-xs text-gray-500 mb-1">
                      {product.categories.map((cat: any) => cat.name).join(', ')}
                    </div>
                  )}

                  {/* Title */}
                  {showTitle && (
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
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
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(product.averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">({product.ratingCount} {__('reviews', 'o4o')})</span>
                    </div>
                  )}

                  {/* Description */}
                  {showDescription && product.shortDescription && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {product.shortDescription}
                    </p>
                  )}

                  {/* Stock Status */}
                  {showStock && (
                    <p className={`text-sm mb-2 ${product.stockStatus === 'in_stock' ? 'text-green-600' : 'text-red-600'}`}>
                      {product.stockStatus === 'in_stock' 
                        ? product.stockQuantity 
                          ? `${product.stockQuantity} ${__('in stock', 'o4o')}`
                          : __('In stock', 'o4o')
                        : __('Out of stock', 'o4o')
                      }
                    </p>
                  )}
                </div>

                <div className="text-right">
                  {/* Price */}
                  {showPrice && (
                    <div className="mb-3">
                      {isOnSale && showSalePrice ? (
                        <>
                          <div className="flex items-center gap-2 justify-end">
                            {showRegularPrice && (
                              <span className="text-sm text-gray-500 line-through">
                                {formatPrice(product.regularPrice, product.currency)}
                              </span>
                            )}
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">
                              -{discountPercentage}%
                            </span>
                          </div>
                          <div 
                            className="text-xl font-bold mt-1"
                            style={{ color: salePriceColor }}
                          >
                            {formatPrice(product.salePrice, product.currency)}
                          </div>
                        </>
                      ) : (
                        <div 
                          className="text-xl font-bold"
                          style={{ color: priceColor }}
                        >
                          {formatPrice(product.regularPrice || product.price, product.currency)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add to Cart Button */}
                  {showAddToCart && (
                    <button
                      className="px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center gap-2 whitespace-nowrap"
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
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
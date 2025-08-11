import { ShoppingCart, Package, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { formatPrice, calculateDiscountPercentage } from '../../../../utils/ecommerce';

interface ProductShowcaseTemplateProps {
  products: any[];
  attributes: any;
  isLoading: boolean;
  error?: string;
}

export function ProductShowcaseTemplate({ products, attributes, isLoading, error }: ProductShowcaseTemplateProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const {
    showImage = true,
    imageSize = 'large',
    showTitle = true,
    showPrice = true,
    showRegularPrice = true,
    showSalePrice = true,
    showStock = true,
    showAddToCart = true,
    showCategories = true,
    showRating = true,
    showDescription = true,
    showSaleBadge = true,
    priceColor,
    salePriceColor = '#e74c3c',
    buttonColor,
    buttonTextColor
  } = attributes;

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="flex gap-8">
          <div className="w-1/2 bg-gray-200 rounded-lg" style={{ paddingBottom: '75%' }}></div>
          <div className="w-1/2 space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-12 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !products || products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg">{error || 'No products found'}</p>
      </div>
    );
  }

  const currentProduct = products[currentIndex];
  const isOnSale = currentProduct.salePrice && currentProduct.salePrice < currentProduct.regularPrice;
  const discountPercentage = isOnSale ? calculateDiscountPercentage(currentProduct.regularPrice, currentProduct.salePrice) : 0;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? products.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === products.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="o4o-product-showcase">
      <div className="flex gap-8 items-start">
        {/* Product Image */}
        {showImage && (
          <div className="w-1/2 relative group">
            <div className="relative overflow-hidden bg-gray-100 rounded-lg">
              <img
                src={currentProduct.image?.[imageSize] || currentProduct.image?.full || '/placeholder-product.jpg'}
                alt={currentProduct.title}
                className="w-full h-auto object-contain"
              />
              
              {/* Sale Badge */}
              {showSaleBadge && isOnSale && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-2 text-lg font-bold rounded">
                  -{discountPercentage}%
                </div>
              )}

              {/* Navigation Arrows */}
              {products.length > 1 && (
                <>
                  <button
                    onClick={handlePrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={'Previous product'}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={'Next product'}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Navigation */}
            {products.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto">
                {products.map((product, index) => (
                  <button
                    key={product.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden transition-all ${
                      index === currentIndex ? 'border-blue-500' : 'border-gray-300'
                    }`}
                  >
                    <img
                      src={product.image?.thumbnail || '/placeholder-product.jpg'}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Product Details */}
        <div className="w-1/2 space-y-4">
          {/* Categories */}
          {showCategories && currentProduct.categories?.length > 0 && (
            <div className="text-sm text-gray-600">
              {currentProduct.categories.map((cat: any) => cat.name).join(' / ')}
            </div>
          )}

          {/* Title */}
          {showTitle && (
            <h2 className="text-3xl font-bold text-gray-900">
              <a href={currentProduct.link} className="hover:text-blue-600 transition-colors">
                {currentProduct.title}
              </a>
            </h2>
          )}

          {/* Rating */}
          {showRating && currentProduct.averageRating > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${i < Math.floor(currentProduct.averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <span className="text-gray-600">
                {currentProduct.averageRating.toFixed(1)} ({currentProduct.ratingCount} {'reviews'})
              </span>
            </div>
          )}

          {/* Price */}
          {showPrice && (
            <div className="py-4 border-y border-gray-200">
              {isOnSale && showSalePrice ? (
                <div className="flex items-baseline gap-3">
                  {showRegularPrice && (
                    <span className="text-xl text-gray-500 line-through">
                      {formatPrice(currentProduct.regularPrice, currentProduct.currency)}
                    </span>
                  )}
                  <span 
                    className="text-3xl font-bold"
                    style={{ color: salePriceColor }}
                  >
                    {formatPrice(currentProduct.salePrice, currentProduct.currency)}
                  </span>
                  <span className="text-sm bg-red-100 text-red-600 px-2 py-1 rounded">
                    {'Save'} {formatPrice(currentProduct.regularPrice - currentProduct.salePrice, currentProduct.currency)}
                  </span>
                </div>
              ) : (
                <span 
                  className="text-3xl font-bold"
                  style={{ color: priceColor }}
                >
                  {formatPrice(currentProduct.regularPrice || currentProduct.price, currentProduct.currency)}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {showDescription && currentProduct.shortDescription && (
            <div className="text-gray-600 space-y-2">
              <p>{currentProduct.shortDescription}</p>
            </div>
          )}

          {/* Stock Status */}
          {showStock && (
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${currentProduct.stockStatus === 'in_stock' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`font-medium ${currentProduct.stockStatus === 'in_stock' ? 'text-green-600' : 'text-red-600'}`}>
                {currentProduct.stockStatus === 'in_stock' 
                  ? currentProduct.stockQuantity 
                    ? `${currentProduct.stockQuantity} ${'in stock'}`
                    : 'In stock'
                  : 'Out of stock'
                }
              </span>
            </div>
          )}

          {/* Product Meta */}
          {currentProduct.sku && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">{'SKU:'}</span> {currentProduct.sku}
            </div>
          )}

          {/* Add to Cart */}
          {showAddToCart && (
            <div className="pt-4">
              <button
                className="px-8 py-3 rounded-md font-medium transition-all duration-200 flex items-center justify-center gap-2 text-lg hover:scale-105"
                style={{
                  backgroundColor: buttonColor || '#2563eb',
                  color: buttonTextColor || '#ffffff'
                }}
                disabled={currentProduct.stockStatus === 'out_of_stock'}
                data-product-id={currentProduct.id}
                data-product-type={currentProduct.type}
              >
                <ShoppingCart className="w-5 h-5" />
                {currentProduct.stockStatus === 'out_of_stock' 
                  ? 'Out of Stock'
                  : 'Add to Cart'
                }
              </button>
            </div>
          )}

          {/* Product Counter */}
          {products.length > 1 && (
            <div className="text-sm text-gray-500 pt-4">
              {currentIndex + 1} / {products.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
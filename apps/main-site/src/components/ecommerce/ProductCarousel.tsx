import { useState, useEffect, useRef, FC, lazy } from 'react';
import { Product } from '@/types/ecommerce';
import { formatCurrency } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProductCarouselProps {
  products: Product[];
  autoplay?: boolean;
  interval?: number;
}

const ProductCarousel: FC<ProductCarouselProps> = ({ 
  products, 
  autoplay = false,
  interval = 5000 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Auto-play functionality
  useEffect(() => {
    if (autoplay && !isHovered && products.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % products.length);
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoplay, isHovered, products.length, interval]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % products.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (products.length === 0) {
    return <div className="text-gray-500">No products to display</div>;
  }

  // Calculate visible products based on screen size
  const visibleProducts = 4; // Default for desktop

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="overflow-hidden rounded-lg">
        <div 
          ref={carouselRef}
          className="flex transition-transform duration-300 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * (100 / visibleProducts)}%)`
          }}
        >
          {products.map((product: any) => (
            <div
              key={product.id}
              className="w-full md:w-1/2 lg:w-1/4 px-2 flex-shrink-0"
            >
              <CarouselCard product={product} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      {products.length > visibleProducts && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-r-lg shadow-lg transition-all z-10"
            aria-label="Previous product"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-l-lg shadow-lg transition-all z-10"
            aria-label="Next product"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {products.length > visibleProducts && (
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: Math.ceil(products.length / visibleProducts) }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index * visibleProducts)}
              className={`w-2 h-2 rounded-full transition-all ${
                Math.floor(currentIndex / visibleProducts) === index
                  ? 'bg-blue-600 w-8'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CarouselCard: FC<{ product: Product }> = ({ product }) => {
  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <Link to={`/products/${product.slug || product.id}`} className="block group">
      <div className="bg-white rounded-lg border hover:shadow-lg transition-all duration-200 h-full">
        {/* Image */}
        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200 rounded-t-lg relative">
          {product.images && product.images[0] ? (
            <img
              src={product.images[0].url}
              alt={product.name}
              className="object-cover object-center w-full h-full group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-48">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
          )}
          
          {/* Discount Badge */}
          {discount > 0 && (
            <span className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-red-500 text-white rounded">
              -{discount}%
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
            {product.name}
          </h3>

          {/* Price */}
          <div className="flex items-center space-x-2">
            <span className="text-base font-semibold text-gray-900">
              {formatCurrency(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-sm text-gray-500 line-through">
                {formatCurrency(product.compareAtPrice)}
              </span>
            )}
          </div>

          {/* Stock Status */}
          {product.stockQuantity === 0 && (
            <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
              품절
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCarousel;
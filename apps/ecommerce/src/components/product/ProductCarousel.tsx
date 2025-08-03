import { FC, useState, useEffect, useRef  } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { Product } from '@o4o/types';
import { formatCurrency } from '@o4o/utils';
import { cn } from '@o4o/utils';

interface ProductCarouselProps {
  products: Product[];
  autoplay?: boolean;
  interval?: number;
  visibleItems?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  className?: string;
}

export const ProductCarousel: FC<ProductCarouselProps> = ({
  products,
  autoplay = false,
  interval = 5000,
  visibleItems = {
    mobile: 1,
    tablet: 2,
    desktop: 4
  },
  className
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">표시할 상품이 없습니다.</p>
      </div>
    );
  }

  const visibleCount = visibleItems.desktop || 4;
  const totalSlides = Math.ceil(products.length / visibleCount);
  const currentSlide = Math.floor(currentIndex / visibleCount);

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="overflow-hidden rounded-lg">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * (100 / visibleCount)}%)`
          }}
        >
          {products.map((product: any) => (
            <div
              key={product.id}
              className={cn(
                'flex-shrink-0 px-2',
                'w-full',
                `md:w-1/${visibleItems.tablet || 2}`,
                `lg:w-1/${visibleItems.desktop || 4}`
              )}
            >
              <CarouselCard product={product} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      {products.length > visibleCount && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-r-lg shadow-lg transition-all z-10"
            aria-label="이전 상품"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-l-lg shadow-lg transition-all z-10"
            aria-label="다음 상품"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {totalSlides > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index * visibleCount)}
              className={cn(
                'h-2 rounded-full transition-all',
                currentSlide === index
                  ? 'bg-primary w-8'
                  : 'bg-muted hover:bg-muted-foreground/50 w-2'
              )}
              aria-label={`슬라이드 ${index + 1}로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CarouselCard: FC<{ product: Product }> = ({ product }) => {
  const customerPrice = product.pricing?.customer || 0;
  const compareAtPrice = (product as any).compareAtPrice || 0;
  const discount = compareAtPrice > customerPrice
    ? Math.round(((compareAtPrice - customerPrice) / compareAtPrice) * 100)
    : 0;

  return (
    <Link to={`/products/${product.slug || product.id}`} className="block group">
      <div className="bg-card rounded-lg border hover:shadow-lg transition-all duration-200 h-full">
        {/* Image */}
        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-muted rounded-t-lg relative">
          {product.images && product.images[0] ? (
            <img
              src={product.images[0].url}
              alt={product.name}
              className="object-cover object-center w-full h-48 group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-48">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 right-2 space-y-1">
            {discount > 0 && (
              <span className="block px-2 py-1 text-xs font-medium bg-destructive text-destructive-foreground rounded">
                -{discount}%
              </span>
            )}
            {product.isFeatured && (
              <span className="block px-2 py-1 text-xs font-medium bg-yellow-400 text-yellow-900 rounded">
                추천
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="text-sm font-medium line-clamp-2 mb-1">
            {product.name}
          </h3>

          {/* Price */}
          <div className="flex items-center space-x-2">
            <span className="text-base font-semibold">
              {formatCurrency(customerPrice)}
            </span>
            {compareAtPrice > customerPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatCurrency(compareAtPrice)}
              </span>
            )}
          </div>

          {/* Stock Status */}
          {product.inventory?.stockQuantity === 0 && (
            <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded">
              품절
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
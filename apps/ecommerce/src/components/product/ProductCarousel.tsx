/**
 * Product Carousel Component (M4 Updated)
 * Uses SlideApp for carousel logic with product overlay
 */

import { FC, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { Product } from '@o4o/types';
import { formatCurrency } from '@o4o/utils';
import { cn } from '@o4o/utils';
import { SlideApp } from '@o4o/slide-app';
import { productsToSlides, calculateDiscount, getProductFromSlide } from '../../utils/productToSlide';

interface ProductCarouselProps {
  products: Product[];
  autoplay?: boolean;
  interval?: number;
  className?: string;
}

export const ProductCarousel: FC<ProductCarouselProps> = ({
  products,
  autoplay = false,
  interval = 5000,
  className
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Transform products to slides
  const slides = useMemo(() => productsToSlides(products), [products]);

  // Get current product
  const currentProduct = useMemo(() => {
    if (!slides[currentSlideIndex]) return null;
    return getProductFromSlide(products, slides[currentSlideIndex].id);
  }, [products, slides, currentSlideIndex]);

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">표시할 상품이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={cn('product-carousel relative', className)}>
      <SlideApp
        slides={slides}
        autoplay={{
          enabled: autoplay,
          delay: interval,
          pauseOnInteraction: true,
        }}
        loop={true}
        navigation={true}
        pagination="dots"
        aspectRatio="4/3"
        a11y={{
          prevLabel: '이전 상품',
          nextLabel: '다음 상품',
          roledescription: '상품 캐러셀',
        }}
        onSlideChange={setCurrentSlideIndex}
        onSlideClick={(slide) => {
          const product = getProductFromSlide(products, slide.id);
          if (product) {
            window.location.href = `/products/${product.slug || product.id}`;
          }
        }}
      />

      {/* Product Info Overlay */}
      {currentProduct && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
          <ProductInfo product={currentProduct} />
        </div>
      )}
    </div>
  );
};

/**
 * Product Info Overlay Component
 * Shows product details over the slide
 */
const ProductInfo: FC<{ product: Product }> = ({ product }) => {
  const customerPrice = product.pricing?.customer || 0;
  const compareAtPrice = (product as any).compareAtPrice || 0;
  const discount = calculateDiscount(customerPrice, compareAtPrice);

  return (
    <Link to={`/products/${product.slug || product.id}`} className="block group">
      <div className="space-y-2">
        {/* Badges */}
        <div className="flex gap-2">
          {discount > 0 && (
            <span className="inline-block px-2 py-1 text-xs font-medium bg-red-600 text-white rounded">
              -{discount}%
            </span>
          )}
          {product.isFeatured && (
            <span className="inline-block px-2 py-1 text-xs font-medium bg-yellow-400 text-yellow-900 rounded">
              추천
            </span>
          )}
          {product.inventory?.stockQuantity === 0 && (
            <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-600 text-white rounded">
              품절
            </span>
          )}
        </div>

        {/* Product Name */}
        <h3 className="text-xl font-bold line-clamp-2 group-hover:underline">
          {product.name}
        </h3>

        {/* Price */}
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">
            {formatCurrency(customerPrice)}
          </span>
          {compareAtPrice > customerPrice && (
            <span className="text-lg text-gray-300 line-through">
              {formatCurrency(compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

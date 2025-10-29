/**
 * Product to Slide Transformation Utility
 * M4: Converts Product data to SlideApp Slide format
 */

import { Product } from '@o4o/types';
import { Slide } from '@o4o/slide-app';

/**
 * Convert a Product to a Slide
 * Note: Using 'mixed' type allows for custom overlay content
 */
export function productToSlide(product: Product): Slide {
  // Get the first product image or use placeholder
  const imageUrl = product.images && product.images[0]
    ? product.images[0].url
    : undefined;

  return {
    id: `product-${product.id}`,
    type: 'image',
    src: imageUrl,
    alt: product.name,
    title: product.name,
    visible: true,
  };
}

/**
 * Convert array of Products to Slides
 */
export function productsToSlides(products: Product[]): Slide[] {
  return products.map(productToSlide);
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(customerPrice: number, compareAtPrice: number): number {
  if (compareAtPrice <= customerPrice) return 0;
  return Math.round(((compareAtPrice - customerPrice) / compareAtPrice) * 100);
}

/**
 * Find product by slide ID
 */
export function getProductFromSlide(products: Product[], slideId: string): Product | undefined {
  const productId = slideId.replace('product-', '');
  return products.find(p => p.id.toString() === productId);
}

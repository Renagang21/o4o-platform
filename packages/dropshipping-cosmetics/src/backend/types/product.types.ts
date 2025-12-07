/**
 * Product Type Definitions for Cosmetics Extension
 *
 * This file defines the Product interface used by cosmetics services.
 * It contains only the fields needed by the cosmetics extension,
 * avoiding dependency on api-server entities.
 */

export interface ProductImages {
  main: string;
  gallery?: string[];
  thumbnails?: string[];
}

export interface ProductCategory {
  id: string;
  name: string;
  slug?: string;
}

/**
 * Product interface for cosmetics services
 *
 * This is a subset of the full Product entity from api-server,
 * containing only the fields used by cosmetics extension.
 */
export interface Product {
  id: string;
  name: string;
  brand?: string;
  recommendedPrice: number;
  description?: string;
  shortDescription?: string;
  images?: ProductImages;
  category?: ProductCategory;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;

  // Helper properties that might exist
  [key: string]: any;
}

/**
 * Type guard to check if a product has cosmetics metadata
 */
export function hasCosmeticsMetadata(product: Product): boolean {
  return !!product.metadata?.cosmetics_metadata;
}

/**
 * Get cosmetics metadata from product
 */
export function getCosmeticsMetadata(product: Product): any {
  return product.metadata?.cosmetics_metadata || {};
}

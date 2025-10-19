import { Category } from './Category';
import { Supplier } from './Supplier';
export declare enum ProductStatus {
    DRAFT = "draft",
    ACTIVE = "active",
    INACTIVE = "inactive",
    OUT_OF_STOCK = "out_of_stock",
    DISCONTINUED = "discontinued"
}
export declare enum ProductType {
    PHYSICAL = "physical",
    DIGITAL = "digital",
    SERVICE = "service",
    SUBSCRIPTION = "subscription"
}
export interface ProductDimensions {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    unit?: 'cm' | 'in' | 'kg' | 'lb';
}
export interface ProductImages {
    main: string;
    gallery?: string[];
    thumbnails?: string[];
}
export interface ProductVariant {
    id: string;
    name: string;
    sku: string;
    price: number;
    comparePrice?: number;
    inventory: number;
    attributes: Record<string, string>;
}
export interface ProductSEO {
    title?: string;
    description?: string;
    keywords?: string[];
    slug?: string;
}
export interface ShippingInfo {
    weight?: number;
    dimensions?: ProductDimensions;
    shippingClass?: string;
    freeShipping?: boolean;
    shippingCost?: number;
}
export declare class Product {
    id: string;
    supplierId: string;
    supplier: Supplier;
    categoryId?: string;
    category?: Category;
    name: string;
    description: string;
    shortDescription?: string;
    sku: string;
    slug: string;
    type: ProductType;
    status: ProductStatus;
    isActive: boolean;
    supplierPrice: number;
    recommendedPrice: number;
    comparePrice?: number;
    currency: string;
    partnerCommissionRate: number;
    partnerCommissionAmount?: number;
    inventory: number;
    lowStockThreshold?: number;
    trackInventory: boolean;
    allowBackorder: boolean;
    images?: ProductImages;
    tags?: string[];
    variants?: ProductVariant[];
    hasVariants: boolean;
    dimensions?: ProductDimensions;
    shipping?: ShippingInfo;
    seo?: ProductSEO;
    features?: string[];
    specifications?: string;
    tierPricing?: {
        bronze?: number;
        silver?: number;
        gold?: number;
        platinum?: number;
    };
    brand?: string;
    model?: string;
    warranty?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date;
    getCurrentPrice(sellerTier?: 'bronze' | 'silver' | 'gold' | 'platinum'): number;
    calculatePartnerCommission(salePrice: number): number;
    isInStock(): boolean;
    isLowStock(): boolean;
    getMainImage(): string | null;
    getGalleryImages(): string[];
    isPublished(): boolean;
    getDiscountPercentage(): number;
    reduceInventory(quantity: number): void;
    increaseInventory(quantity: number): void;
    canOrder(quantity: number): boolean;
}
//# sourceMappingURL=Product.d.ts.map
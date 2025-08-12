import { User } from './User';
import { ProductAttribute } from './ProductAttribute';
import { ProductVariation } from './ProductVariation';
export declare enum ProductStatus {
    DRAFT = "draft",
    ACTIVE = "active",
    INACTIVE = "inactive",
    OUT_OF_STOCK = "out_of_stock"
}
export declare enum ProductType {
    PHYSICAL = "physical",
    DIGITAL = "digital",
    SERVICE = "service"
}
export declare class Product {
    id: string;
    name: string;
    slug: string;
    description?: string;
    shortDescription?: string;
    sku: string;
    retailPrice: number;
    wholesalePrice?: number;
    affiliatePrice?: number;
    salePrice?: number;
    cost?: number;
    stockQuantity: number;
    manageStock: boolean;
    lowStockThreshold?: number;
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    status: ProductStatus;
    type: ProductType;
    featured: boolean;
    requiresShipping: boolean;
    images?: string[];
    featuredImage?: string;
    categoryId?: string;
    tags?: string[];
    metaTitle?: string;
    metaDescription?: string;
    createdBy: string;
    creator: User;
    vendorId?: string;
    supplierId?: string;
    userId?: string;
    hasVariations: boolean;
    attributes: ProductAttribute[];
    variations: ProductVariation[];
    reviews?: any[];
    compareAtPrice?: number;
    rating?: number;
    reviewCount?: number;
    salesCount?: number;
    brand?: string;
    metadata?: Record<string, any>;
    visibility?: string;
    get price(): number;
    set price(value: number);
    get stock(): number;
    set stock(value: number);
    get isActive(): boolean;
    get category(): string | undefined;
    get vendor(): string | undefined;
    shipping?: {
        weight?: number;
        length?: number;
        width?: number;
        height?: number;
        shippingClass?: string;
        freeShipping?: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
    getPriceForUser(userRole: string): number;
    isInStock(): boolean;
    isLowStock(): boolean;
}
//# sourceMappingURL=Product.d.ts.map
import { Seller } from './Seller';
import { Product } from './Product';
export declare enum SellerProductStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    OUT_OF_STOCK = "out_of_stock",
    DISCONTINUED = "discontinued"
}
export declare class SellerProduct {
    id: string;
    sellerId: string;
    seller: Seller;
    productId: string;
    product: Product;
    sellerPrice: number;
    comparePrice?: number;
    costPrice: number;
    profit: number;
    profitMargin: number;
    status: SellerProductStatus;
    isActive: boolean;
    isVisible: boolean;
    sellerInventory?: number;
    reservedInventory?: number;
    totalSold: number;
    totalRevenue: number;
    viewCount: number;
    cartAddCount: number;
    sellerSku?: string;
    sellerDescription?: string;
    sellerTags?: string[];
    sellerImages?: string[];
    isFeatured: boolean;
    featuredUntil?: Date;
    discountRate?: number;
    saleStartDate?: Date;
    saleEndDate?: Date;
    sellerSlug?: string;
    seoMetadata?: {
        title?: string;
        description?: string;
        keywords?: string[];
    };
    conversionRate: number;
    averageOrderValue: number;
    averageRating: number;
    reviewCount: number;
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date;
    lastSoldAt?: Date;
    calculateProfit(): number;
    calculateProfitMargin(): number;
    updatePricing(): void;
    getDiscountedPrice(): number;
    isOnSale(): boolean;
    getAvailableInventory(): number;
    canOrder(quantity: number): boolean;
    recordSale(quantity: number, amount: number): void;
    recordView(): void;
    recordCartAdd(): void;
    updateConversionRate(): void;
    updateRating(newRating: number): void;
    activate(): void;
    deactivate(): void;
    markOutOfStock(): void;
    discontinue(): void;
    setDiscount(rate: number, startDate: Date, endDate: Date): void;
    clearDiscount(): void;
    setFeatured(until: Date): void;
    clearFeatured(): void;
    isFeaturedActive(): boolean;
}
//# sourceMappingURL=SellerProduct.d.ts.map
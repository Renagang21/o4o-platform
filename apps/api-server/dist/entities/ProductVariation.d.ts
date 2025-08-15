import { Product } from './Product';
/**
 * 상품 변형 엔티티 (특정 속성 조합의 개별 SKU)
 * 예: "빨간색 + L 사이즈" 조합
 */
export declare class ProductVariation {
    id: string;
    productId: string;
    product: Product;
    sku: string;
    barcode: string;
    attributes: {
        [key: string]: {
            name: string;
            value: string;
            slug: string;
        };
    };
    attributeString: string;
    retailPrice: number;
    salePrice: number;
    wholesalePrice: number;
    affiliatePrice: number;
    manageStock: boolean;
    stockQuantity: number;
    stockStatus: 'in_stock' | 'out_of_stock' | 'on_backorder';
    lowStockThreshold: number;
    weight: number;
    dimensions: {
        length: number;
        width: number;
        height: number;
        unit: 'cm' | 'inch';
    };
    images: Array<{
        url: string;
        alt?: string;
        position: number;
    }>;
    imageUrl: string;
    status: 'active' | 'inactive' | 'discontinued';
    enabled: boolean;
    position: number;
    lowStockAlert: boolean;
    get price(): number;
    set price(value: number);
    get compareAtPrice(): number | undefined;
    set compareAtPrice(value: number | undefined);
    get stock(): number;
    set stock(value: number);
    get isActive(): boolean;
    metadata: {
        costPrice?: number;
        compareAtPrice?: number;
        fulfillmentService?: string;
        requiresShipping?: boolean;
        taxable?: boolean;
        gtin?: string;
        mpn?: string;
        customFields?: Record<string, any>;
    };
    createdAt: Date;
    updatedAt: Date;
    isInStock(): boolean;
    isLowStock(): boolean;
    getPrice(role?: string): number;
    getDisplayName(): string;
}
//# sourceMappingURL=ProductVariation.d.ts.map
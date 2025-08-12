import { ProductAttribute } from './ProductAttribute';
/**
 * 상품 속성 값 엔티티 (예: Red, Large, Cotton 등)
 */
export declare class ProductAttributeValue {
    id: string;
    attributeId: string;
    attribute: ProductAttribute;
    value: string;
    slug: string;
    label: string;
    colorCode: string;
    imageUrl: string;
    metadata: {
        sortOrder?: number;
        isDefault?: boolean;
        priceAdjustment?: number;
        stockAdjustment?: number;
    };
    position: number;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=ProductAttributeValue.d.ts.map
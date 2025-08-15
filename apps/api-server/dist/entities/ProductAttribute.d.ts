import { Product } from './Product';
import { ProductAttributeValue } from './ProductAttributeValue';
/**
 * 상품 속성 엔티티 (예: 색상, 사이즈, 재질 등)
 */
export declare class ProductAttribute {
    id: string;
    productId: string;
    product: Product;
    name: string;
    slug: string;
    type: 'select' | 'color' | 'button' | 'image';
    position: number;
    visible: boolean;
    variation: boolean;
    values: ProductAttributeValue[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=ProductAttribute.d.ts.map
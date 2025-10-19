import { Cart } from './Cart';
export declare class CartItem {
    id: string;
    cartId: string;
    cart: Cart;
    productId: string;
    productName: string;
    productSku: string;
    productImage: string;
    productBrand: string;
    variationId: string;
    variationName: string;
    unitPrice: number;
    quantity: number;
    product: any;
    maxOrderQuantity: number;
    stockQuantity: number;
    supplierId: string;
    supplierName: string;
    attributes: Record<string, string>;
    addedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    getTotalPrice(): number;
    isInStock(): boolean;
    exceedsMaxOrder(): boolean;
    hasValidationErrors(): string[];
}
//# sourceMappingURL=CartItem.d.ts.map
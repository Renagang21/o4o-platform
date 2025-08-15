import { Cart } from './Cart';
import { Product } from './Product';
export declare class CartItem {
    id: string;
    cartId: string;
    cart: Cart;
    productId: string;
    product: Product;
    quantity: number;
    price: number;
    productSnapshot?: {
        name: string;
        image: string;
        sku: string;
        attributes?: Record<string, string | number | boolean>;
    };
    createdAt: Date;
    updatedAt: Date;
    getTotalPrice(): number;
}
//# sourceMappingURL=CartItem.d.ts.map
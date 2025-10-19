import { User } from './User';
import { CartItem } from './CartItem';
export interface CartSummary {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
}
export declare class Cart {
    id: string;
    userId: string;
    user: User;
    items: CartItem[];
    summary: CartSummary;
    coupons: string[];
    discountCodes: string[];
    sessionId: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    calculateSummary(): CartSummary;
    updateSummary(): void;
    getTotalItems(): number;
    isEmpty(): boolean;
}
//# sourceMappingURL=Cart.d.ts.map
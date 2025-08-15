import { User } from './User';
import { CartItem } from './CartItem';
export declare class Cart {
    id: string;
    userId: string;
    user: User;
    items: CartItem[];
    metadata?: {
        sessionId?: string;
        guestEmail?: string;
        notes?: string;
    };
    createdAt: Date;
    updatedAt: Date;
    getTotalItems(): number;
    getTotalPrice(): number;
    isEmpty(): boolean;
}
//# sourceMappingURL=Cart.d.ts.map
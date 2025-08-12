import { User } from './User';
import { OrderItem } from './OrderItem';
export declare enum OrderStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    PROCESSING = "processing",
    READY_TO_SHIP = "ready_to_ship",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    REFUNDED = "refunded"
}
export type OrderStatusString = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export declare enum PaymentStatus {
    PENDING = "pending",
    PAID = "paid",
    FAILED = "failed",
    REFUNDED = "refunded"
}
export declare enum PaymentMethod {
    CREDIT_CARD = "credit_card",
    BANK_TRANSFER = "bank_transfer",
    PAYPAL = "paypal",
    KAKAO_PAY = "kakao_pay",
    NAVER_PAY = "naver_pay",
    CASH_ON_DELIVERY = "cash_on_delivery"
}
export declare class Order {
    id: string;
    orderNumber: string;
    userId: string;
    user: User;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    currency?: string;
    affiliateId?: string;
    vendorId?: string;
    items: OrderItem[];
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod?: PaymentMethod;
    paymentId?: string;
    subtotal: number;
    taxAmount: number;
    shippingFee: number;
    discountAmount: number;
    totalAmount: number;
    shippingAddress: {
        name: string;
        phone: string;
        address: string;
        addressDetail: string;
        zipCode: string;
        city: string;
        state: string;
        country: string;
    };
    billingAddress?: {
        name: string;
        phone: string;
        address: string;
        addressDetail: string;
        zipCode: string;
        city: string;
        state: string;
        country: string;
    };
    trackingNumber?: string;
    shippedAt?: Date;
    deliveredAt?: Date;
    notes?: string;
    metadata?: {
        source?: string;
        referrer?: string;
        couponCode?: string;
        adminNotes?: string;
        lastStatusChange?: string;
        statusHistory?: any[];
        deliveredAt?: string;
        reviewRequested?: string;
        receiptUrl?: string;
        paymentKey?: string;
        [key: string]: any;
    };
    billing?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
    };
    shipping?: {
        firstName?: string;
        lastName?: string;
        address?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
        method?: string;
        trackingNumber?: string;
        trackingUrl?: string;
        carrier?: string;
        status?: string;
        shippedAt?: Date;
        deliveredAt?: Date;
        estimatedDelivery?: Date;
        currentLocation?: string;
        cost?: number;
        paidBy?: string;
    };
    createdAt: Date;
    updatedAt: Date;
    generateOrderNumber(): string;
    canCancel(): boolean;
    canRefund(): boolean;
    getTotalItems(): number;
}
//# sourceMappingURL=Order.d.ts.map
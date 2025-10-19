import { User } from './User';
export declare enum OrderStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    PROCESSING = "processing",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    CANCELLED = "cancelled",
    RETURNED = "returned"
}
export declare enum PaymentStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed",
    REFUNDED = "refunded"
}
export declare enum PaymentMethod {
    CARD = "card",
    TRANSFER = "transfer",
    VIRTUAL_ACCOUNT = "virtual_account",
    KAKAO_PAY = "kakao_pay",
    NAVER_PAY = "naver_pay",
    PAYPAL = "paypal",
    CASH_ON_DELIVERY = "cash_on_delivery"
}
export interface Address {
    recipientName: string;
    phone: string;
    email?: string;
    company?: string;
    zipCode: string;
    address: string;
    detailAddress: string;
    city: string;
    state?: string;
    country: string;
    deliveryRequest?: string;
}
export interface OrderSummary {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
    handlingFee?: number;
    insuranceFee?: number;
    serviceFee?: number;
}
export declare class Order {
    id: string;
    orderNumber: string;
    buyerId: string;
    buyer: User;
    buyerType: string;
    buyerName: string;
    buyerEmail: string;
    buyerGrade: string;
    items: OrderItem[];
    summary: OrderSummary;
    currency: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    billingAddress: Address;
    shippingAddress: Address;
    shippingMethod: string;
    trackingNumber: string;
    trackingUrl: string;
    orderDate: Date;
    paymentDate: Date;
    confirmedDate: Date;
    shippingDate: Date;
    deliveryDate: Date;
    cancelledDate: Date;
    notes: string;
    customerNotes: string;
    adminNotes: string;
    cancellationReason: string;
    returnReason: string;
    refundAmount: number;
    refundDate: Date;
    source: string;
    createdAt: Date;
    updatedAt: Date;
    generateOrderNumber(): string;
    calculateTotal(): number;
    canBeCancelled(): boolean;
    canBeRefunded(): boolean;
}
export interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    productImage: string;
    productBrand?: string;
    variationId?: string;
    variationName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    supplierId: string;
    supplierName: string;
    attributes?: Record<string, string>;
    notes?: string;
}
//# sourceMappingURL=Order.d.ts.map
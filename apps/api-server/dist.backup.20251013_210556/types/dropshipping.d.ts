export declare enum SupplierStatus {
    PENDING = "pending",
    VERIFIED = "verified",
    SUSPENDED = "suspended",
    REJECTED = "rejected"
}
export declare enum SellerLevel {
    BRONZE = "bronze",
    SILVER = "silver",
    GOLD = "gold",
    PLATINUM = "platinum"
}
export declare enum AffiliateStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended"
}
export declare enum OrderStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    PROCESSING = "processing",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    CANCELLED = "cancelled",
    REFUNDED = "refunded"
}
export declare enum CommissionStatus {
    PENDING = "pending",
    APPROVED = "approved",
    PAID = "paid",
    CANCELLED = "cancelled"
}
export interface SupplierInfo {
    companyName: string;
    businessNumber: string;
    businessLicense?: string;
    onlineSellingLicense?: string;
    contactPerson: string;
    contactEmail: string;
    contactPhone: string;
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    bankAccount?: {
        bankName: string;
        accountNumber: string;
        accountHolder: string;
    };
    commissionRate: number;
    verificationStatus: SupplierStatus;
    verifiedAt?: Date;
    verifiedBy?: string;
}
export interface SellerInfo {
    storeName: string;
    storeUrl?: string;
    description?: string;
    sellerLevel: SellerLevel;
    salesPerformance: {
        totalSales: number;
        monthlyAverage: number;
        returnRate: number;
        customerSatisfaction: number;
    };
    marketplaces?: string[];
    commissionRate?: number;
}
export interface AffiliateInfo {
    referralCode: string;
    websiteUrl?: string;
    socialMedia?: {
        youtube?: string;
        instagram?: string;
        facebook?: string;
        tiktok?: string;
        blog?: string;
    };
    commissionSettings: {
        baseRate: number;
        tieredRates?: {
            level: number;
            minSales: number;
            rate: number;
        }[];
    };
    performanceMetrics: {
        totalClicks: number;
        totalConversions: number;
        conversionRate: number;
        totalEarnings: number;
        monthlyEarnings: number;
    };
    paymentMethod?: {
        type: 'bank' | 'paypal' | 'stripe';
        details: Record<string, string>;
    };
    status: AffiliateStatus;
}
export interface DropshippingProduct {
    supplierId: string;
    sku: string;
    name: string;
    description: string;
    category: string;
    subcategory?: string;
    images: string[];
    pricing: {
        supplierPrice: number;
        msrp: number;
        minSellingPrice?: number;
    };
    inventory: {
        quantity: number;
        reserved: number;
        available: number;
        lowStockThreshold: number;
    };
    shipping: {
        weight: number;
        dimensions: {
            length: number;
            width: number;
            height: number;
        };
        shippingClass: string;
        estimatedDays: number;
    };
    attributes?: Record<string, any>;
    variations?: {
        id: string;
        name: string;
        sku: string;
        price: number;
        inventory: number;
        attributes: Record<string, any>;
    }[];
    isActive: boolean;
    tags?: string[];
}
export interface DropshippingOrder {
    orderId: string;
    buyerId: string;
    sellerId?: string;
    supplierId: string;
    affiliateId?: string;
    products: {
        productId: string;
        sku: string;
        quantity: number;
        price: number;
        supplierPrice: number;
    }[];
    pricing: {
        subtotal: number;
        shipping: number;
        tax: number;
        discount: number;
        total: number;
        supplierCost: number;
        sellerProfit: number;
        affiliateCommission?: number;
    };
    shipping: {
        method: string;
        address: {
            name: string;
            phone: string;
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
        };
        trackingNumber?: string;
        carrier?: string;
        estimatedDelivery?: Date;
    };
    status: OrderStatus;
    statusHistory: {
        status: OrderStatus;
        timestamp: Date;
        note?: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
}
export interface AffiliateCommission {
    commissionId: string;
    affiliateId: string;
    orderId: string;
    orderAmount: number;
    commissionRate: number;
    commissionAmount: number;
    status: CommissionStatus;
    approvedAt?: Date;
    paidAt?: Date;
    paymentReference?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ROLE_PERMISSIONS: {
    SUPPLIER: string[];
    SELLER: string[];
    AFFILIATE: string[];
    CUSTOMER: string[];
    ADMIN: string[];
};
export declare function hasPermission(userRoles: string[], requiredPermission: string): boolean;
//# sourceMappingURL=dropshipping.d.ts.map
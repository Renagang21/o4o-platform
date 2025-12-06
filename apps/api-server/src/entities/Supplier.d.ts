import type { User } from './User.js';
import { BusinessInfo } from './BusinessInfo.js';
import type { Product } from './Product.js';
export declare enum SupplierStatus {
    PENDING = "pending",
    APPROVED = "approved",
    SUSPENDED = "suspended",
    REJECTED = "rejected"
}
export declare enum SupplierTier {
    BASIC = "basic",
    PREMIUM = "premium",
    ENTERPRISE = "enterprise"
}
export interface SupplierPolicy {
    minOrderAmount?: number;
    maxOrderAmount?: number;
    processingTime?: number;
    returnPolicy?: string;
    shippingPolicy?: string;
    paymentTerms?: string;
}
export interface SellerTierPricing {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
}
export interface SupplierMetrics {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    averageRating: number;
    responseTime: number;
    fulfillmentRate: number;
}
export declare class Supplier {
    id: string;
    userId: string;
    user: User;
    businessInfo: BusinessInfo;
    products: Product[];
    status: SupplierStatus;
    tier: SupplierTier;
    isActive: boolean;
    companyDescription?: string;
    specialties?: string[];
    certifications?: string[];
    website?: string;
    sellerTierDiscounts?: SellerTierPricing;
    supplierPolicy?: SupplierPolicy;
    defaultPartnerCommissionRate: number;
    defaultPartnerCommissionAmount?: number;
    taxId?: string;
    bankName?: string;
    bankAccount?: string;
    accountHolder?: string;
    metrics?: SupplierMetrics;
    averageRating: number;
    totalReviews: number;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    operatingHours?: string[];
    timezone?: string;
    shippingMethods?: string[];
    paymentMethods?: string[];
    foundedYear?: number;
    employeeCount?: number;
    socialMedia?: {
        website?: string;
        linkedin?: string;
        facebook?: string;
        instagram?: string;
    };
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    approvedAt?: Date;
    approvedBy?: string;
    isApproved(): boolean;
    canCreateProducts(): boolean;
    getDiscountedPrice(originalPrice: number, sellerTier: 'bronze' | 'silver' | 'gold' | 'platinum'): number;
    calculatePartnerCommission(salePrice: number, productCommissionRate?: number): number;
    getMaxProducts(): number;
    getCommissionRate(): number;
    updateMetrics(metrics: Partial<SupplierMetrics>): void;
    updateRating(newRating: number): void;
    approve(approvedBy: string): void;
    suspend(): void;
    reject(): void;
    reactivate(): void;
}
//# sourceMappingURL=Supplier.d.ts.map
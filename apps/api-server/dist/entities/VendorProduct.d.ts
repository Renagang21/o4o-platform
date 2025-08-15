import { User } from './User';
export declare class VendorProduct {
    id: string;
    name: string;
    description: string;
    sku: string;
    categoryId: string;
    supplierId: string;
    supplier: User;
    supplyPrice: number;
    sellPrice: number;
    marginRate: number;
    affiliateRate: number;
    adminFeeRate: number;
    approvalStatus: string;
    approvalRequired: boolean;
    approvedBy: string;
    approvedAt: Date;
    rejectionReason: string;
    stock: number;
    lowStockThreshold: number;
    status: string;
    images: string[];
    options: any;
    tags: string[];
    totalSales: number;
    totalRevenue: number;
    createdAt: Date;
    updatedAt: Date;
    get supplierProfit(): number;
    get isLowStock(): boolean;
    get isOutOfStock(): boolean;
}
//# sourceMappingURL=VendorProduct.d.ts.map
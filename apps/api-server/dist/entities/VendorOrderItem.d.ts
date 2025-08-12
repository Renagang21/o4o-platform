import { OrderItem } from './OrderItem';
import { VendorProduct } from './VendorProduct';
export declare class VendorOrderItem extends OrderItem {
    supplierId: string;
    supplyPrice: number;
    supplierProfit: number;
    affiliateCommission: number;
    adminCommission: number;
    vendorId: string;
    vendorProduct: VendorProduct;
    get cost(): number;
    get vendorProfit(): number;
    get platformCommission(): number;
    get vendor(): string;
}
//# sourceMappingURL=VendorOrderItem.d.ts.map
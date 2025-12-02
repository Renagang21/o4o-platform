/**
 * Dropshipping Core - Entities
 *
 * TypeORM entities for dropshipping system
 */

export { Product } from './Product.js';
export { Supplier } from './Supplier.js';
export { Seller } from './Seller.js';
export { SellerProduct } from './SellerProduct.js';
export { SellerAuthorization } from './SellerAuthorization.js';
export { Partner } from './Partner.js';
export { Commission } from './Commission.js';
export { CommissionPolicy } from './CommissionPolicy.js';
export { PartnerCommission } from './PartnerCommission.js';
export { Settlement } from './Settlement.js';
export { SettlementItem } from './SettlementItem.js';
export { PartnerProfile } from './PartnerProfile.js';
export { SellerProfile } from './SellerProfile.js';
export { SupplierProfile } from './SupplierProfile.js';
export { ChannelProductLink } from './ChannelProductLink.js';
export { SellerChannelAccount } from './SellerChannelAccount.js';
export { PaymentSettlement } from './PaymentSettlement.js';

// Export all entities as array for TypeORM DataSource
import { Product } from './Product.js';
import { Supplier } from './Supplier.js';
import { Seller } from './Seller.js';
import { SellerProduct } from './SellerProduct.js';
import { SellerAuthorization } from './SellerAuthorization.js';
import { Partner } from './Partner.js';
import { Commission } from './Commission.js';
import { CommissionPolicy } from './CommissionPolicy.js';
import { PartnerCommission } from './PartnerCommission.js';
import { Settlement } from './Settlement.js';
import { SettlementItem } from './SettlementItem.js';
import { PartnerProfile } from './PartnerProfile.js';
import { SellerProfile } from './SellerProfile.js';
import { SupplierProfile } from './SupplierProfile.js';
import { ChannelProductLink } from './ChannelProductLink.js';
import { SellerChannelAccount } from './SellerChannelAccount.js';
import { PaymentSettlement } from './PaymentSettlement.js';

export const dropshippingEntities = [
  Product,
  Supplier,
  Seller,
  SellerProduct,
  SellerAuthorization,
  Partner,
  Commission,
  CommissionPolicy,
  PartnerCommission,
  Settlement,
  SettlementItem,
  PartnerProfile,
  SellerProfile,
  SupplierProfile,
  ChannelProductLink,
  SellerChannelAccount,
  PaymentSettlement,
];

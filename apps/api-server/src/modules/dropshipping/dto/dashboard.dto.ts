/**
 * Dashboard DTOs
 * Phase B-4 Step 10 - Dashboard summary and KPI data transfer objects
 */

/**
 * Date range filter for dashboard queries
 * Supports both new (startDate/endDate) and legacy (from/to) properties
 */
export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
  from?: Date; // Legacy property (backward compatibility)
  to?: Date;   // Legacy property (backward compatibility)
  range?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

/**
 * Dashboard metadata DTO
 */
export interface DashboardMetaDto {
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  dataSource: string;
  version: string;
}

/**
 * Create dashboard metadata helper
 */
export function createDashboardMeta(
  periodStart: Date,
  periodEnd: Date,
  dataSource = 'database',
  version = '2.0'
): DashboardMetaDto {
  return {
    generatedAt: new Date(),
    periodStart,
    periodEnd,
    dataSource,
    version
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Seller Dashboard Summary DTO
 */
export interface SellerDashboardSummaryDto {
  // Authorization stats
  totalAuthorizations: number;
  pendingAuthorizations: number;
  approvedAuthorizations: number;
  rejectedAuthorizations: number;

  // Product stats
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  lowStockProducts?: number;
  outOfStockProducts?: number;
  totalProductSales?: number;  // Total sales count across products
  totalUnitsSold?: number;     // Total units sold

  // Order stats
  totalOrders: number;
  pendingOrders?: number;
  completedOrders?: number;
  cancelledOrders?: number;

  // Revenue stats
  totalRevenue: number;
  totalItems: number;
  averageOrderValue: number;
  totalCommission?: number; // Optional commission tracking

  // Legacy fields (backward compatibility)
  totalSalesAmount?: number;
  avgOrderAmount?: number;
  totalCommissionAmount?: number;
  orderCount?: number;
  salesAmount?: number;
  sellerAmount?: number;

  // Time period
  periodStart?: Date;
  periodEnd?: Date;
}

/**
 * Supplier Dashboard Summary DTO
 */
export interface SupplierDashboardSummaryDto {
  // Product stats
  totalProducts: number;
  approvedProducts: number;
  pendingProducts: number;
  draftProducts?: number; // Optional draft product tracking
  rejectedProducts?: number; // Optional rejected product tracking

  // Inventory stats
  totalInventory?: number; // Optional inventory tracking
  lowStockProducts: number;
  outOfStockProducts: number;

  // Order stats
  totalOrders: number;
  pendingOrders?: number; // Optional order status breakdown
  processingOrders?: number; // Optional order status breakdown
  shippedOrders?: number; // Optional order status breakdown
  completedOrders?: number; // Optional order status breakdown

  // Revenue stats
  totalRevenue: number;
  totalItems: number;
  averageOrderValue: number;
  totalProfit?: number; // Optional profit tracking

  // Authorization stats
  totalAuthorizationRequests?: number; // Optional authorization tracking
  pendingRequests?: number; // Optional authorization tracking
  approvedRequests?: number; // Optional authorization tracking

  // Legacy fields (backward compatibility)
  monthlyOrders?: number;
  avgOrderValue?: number;
  avgOrderAmount?: number; // Alias for averageOrderValue

  // Time period
  periodStart?: Date;
  periodEnd?: Date;
}

/**
 * Partner Dashboard Summary DTO
 */
export interface PartnerDashboardSummaryDto {
  // Referral stats
  totalReferrals: number;
  activeReferrals: number;
  conversionRate: number;

  // Order stats
  totalOrders: number;
  completedOrders: number;

  // Commission stats
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;

  // Revenue stats
  totalReferralRevenue: number;
  averageCommissionPerOrder: number;

  // Time period
  periodStart?: Date;
  periodEnd?: Date;
}

/**
 * Daily statistics DTO
 */
export interface DailyStatsDto {
  date: string; // ISO date string YYYY-MM-DD
  orders: number;
  revenue: number;
  items: number;
  averageOrderValue: number;
}

/**
 * Product performance DTO
 */
export interface ProductPerformanceDto {
  productId: string;
  productName: string;
  totalOrders: number;
  totalQuantity: number;
  totalRevenue: number;
  averagePrice: number;
}

/**
 * Settlement summary DTO
 */
export interface SettlementSummaryDto {
  totalSettlements: number;
  totalPendingAmount: number;
  totalProcessingAmount: number;
  totalPaidAmount: number;
  settlementsByPartyType: Record<string, number>;
  settlementsByStatus: Record<string, number>;
}

/**
 * Daily settlement totals DTO
 */
export interface DailySettlementTotalsDto {
  date: string;
  totalAmount: number;
  totalSettlements: number;
  pendingAmount: number;
  processingAmount: number;
  paidAmount: number;
}

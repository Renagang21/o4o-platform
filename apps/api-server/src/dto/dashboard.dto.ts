/**
 * R-6-2: Dashboard API Standardization
 * Common DTO definitions for all dashboard APIs
 *
 * Purpose: Ensure consistent response structure across Seller/Supplier/Partner dashboards
 */

/**
 * Standard date range filter
 * Supports both preset ranges (7d, 30d, etc.) and custom date ranges
 */
export interface DashboardDateRange {
  /** Preset range: 7d | 30d | 90d | 1y | custom */
  range?: '7d' | '30d' | '90d' | '1y' | 'custom';
  /** Custom start date (ISO8601) - required when range=custom */
  start?: string;
  /** Custom end date (ISO8601) - required when range=custom */
  end?: string;
}

/**
 * Standard metadata included in all dashboard responses
 */
export interface DashboardMetaDto {
  /** Date range used for the query */
  range: '7d' | '30d' | '90d' | '1y' | 'custom';
  /** Start date (ISO8601) */
  startDate: string;
  /** End date (ISO8601) */
  endDate: string;
  /** When the data was calculated */
  calculatedAt: string;
}

/**
 * Standard dashboard summary structure
 * Contains core KPI metrics common to all dashboards
 */
export interface DashboardSummaryDto {
  // Order metrics
  /** Total number of orders */
  totalOrders: number;
  /** Total revenue/sales amount */
  totalRevenue: number;
  /** Average order value (AOV) */
  averageOrderValue: number;

  // Product metrics (optional - not all roles have products)
  /** Total number of products/items */
  totalProducts?: number;
  /** Total items sold */
  totalItems?: number;

  // Commission metrics (optional - seller/partner only)
  /** Total commission earned */
  totalCommission?: number;
  /** Pending commissions */
  pendingCommission?: number;

  // Metadata
  meta: DashboardMetaDto;
}

/**
 * Chart data point for time-series data
 */
export interface ChartDataPoint {
  /** Date label (ISO8601 or formatted string) */
  date: string;
  /** Numeric value for this data point */
  value: number;
  /** Optional label for display */
  label?: string;
}

/**
 * Standard chart data structure
 */
export interface DashboardChartDto {
  /** Chart title */
  title: string;
  /** Chart type */
  type: 'line' | 'bar' | 'pie' | 'donut';
  /** Data series */
  series: Array<{
    name: string;
    data: ChartDataPoint[] | number[];
  }>;
  /** Categories/labels for x-axis */
  categories?: string[];
  /** Metadata */
  meta: DashboardMetaDto;
}

/**
 * Standard table structure for dashboard data
 */
export interface DashboardTableDto<T = any> {
  /** Table rows */
  rows: T[];
  /** Total count (before pagination) */
  total: number;
  /** Pagination info */
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
  };
  /** Metadata */
  meta?: DashboardMetaDto;
}

/**
 * Complete dashboard response structure
 * Combines summary, charts, and tables
 */
export interface DashboardResponseDto {
  success: true;
  /** Summary KPIs */
  summary: DashboardSummaryDto;
  /** Chart data (optional) */
  charts?: Record<string, DashboardChartDto>;
  /** Table data (optional) */
  tables?: Record<string, DashboardTableDto>;
}

/**
 * Standard error response for dashboard APIs
 */
export interface DashboardErrorDto {
  success: false;
  error: {
    /** Error code */
    code: 'NOT_FOUND' | 'INVALID_RANGE' | 'INVALID_PARAMS' | 'UNAUTHORIZED' | 'SERVER_ERROR';
    /** Human-readable error message */
    message: string;
    /** Additional error details (optional) */
    details?: any;
  };
}

/**
 * Union type for all dashboard responses
 */
export type DashboardApiResponse = DashboardResponseDto | DashboardErrorDto;

/**
 * Seller-specific summary DTO
 * Extends base summary with seller-specific fields
 */
export interface SellerDashboardSummaryDto extends Omit<DashboardSummaryDto, 'meta'> {
  /** Commission amount for seller's items */
  totalCommission: number;
  /** Number of items sold by this seller */
  totalItems: number;

  // Legacy fields for backward compatibility
  /** @deprecated Use totalOrders */
  orderCount?: number;
  /** @deprecated Use totalRevenue */
  salesAmount?: number;
  /** @deprecated Use totalRevenue */
  totalSalesAmount?: number;
  /** @deprecated Use averageOrderValue */
  avgOrderAmount?: number;
  /** @deprecated Use totalCommission */
  totalCommissionAmount?: number;
  /** @deprecated Use totalRevenue (seller's portion of total sales) */
  sellerAmount?: number;
}

/**
 * Supplier-specific summary DTO
 * Extends base summary with supplier-specific fields
 */
export interface SupplierDashboardSummaryDto extends Omit<DashboardSummaryDto, 'meta'> {
  /** Total products managed by supplier */
  totalProducts: number;
  /** Approved products */
  approvedProducts: number;
  /** Pending approval products */
  pendingProducts: number;
  /** Rejected products */
  rejectedProducts: number;
  /** Low stock products count */
  lowStockProducts: number;
  /** Out of stock products count */
  outOfStockProducts: number;
  /** Total profit (revenue - costs) */
  totalProfit?: number;
  /** Pending fulfillment orders */
  pendingFulfillment?: number;

  // Legacy fields for backward compatibility
  /** @deprecated Use totalOrders */
  monthlyOrders?: number;
  /** @deprecated Use averageOrderValue */
  avgOrderValue?: number;
  /** @deprecated Use period info from meta */
  period?: string;
  /** @deprecated Use meta.startDate */
  startDate?: string;
  /** @deprecated Use meta.endDate */
  endDate?: string;
  /** @deprecated Use meta.calculatedAt */
  calculatedAt?: string;
}

/**
 * Partner-specific summary DTO
 * Extends base summary with partner-specific fields
 */
export interface PartnerDashboardSummaryDto extends Omit<DashboardSummaryDto, 'meta'> {
  /** Total earnings (confirmed commissions) */
  totalEarnings: number;
  /** This month's earnings */
  monthlyEarnings: number;
  /** Pending commissions */
  pendingCommissions: number;
  /** Conversion rate (%) */
  conversionRate: number;
  /** Total clicks on referral links */
  totalClicks: number;
  /** Total conversions (orders) */
  totalConversions: number;
  /** Number of active referral links */
  activeLinks: number;
  /** Partner tier level */
  tierLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  /** Progress to next tier (0-100%) */
  tierProgress: number;
  /** Referral code */
  referralCode: string;
  /** Referral link */
  referralLink?: string;
  /** Next payout date */
  nextPayout?: string;
  /** Available balance */
  availableBalance?: number;
  /** Minimum payout threshold */
  minimumPayout?: number;
}

/**
 * Helper function to create standard error response
 */
export function createDashboardError(
  code: DashboardErrorDto['error']['code'],
  message: string,
  details?: any
): DashboardErrorDto {
  return {
    success: false,
    error: {
      code,
      message,
      details
    }
  };
}

/**
 * Helper function to create dashboard metadata
 */
export function createDashboardMeta(
  range: DashboardDateRange,
  startDate: Date,
  endDate: Date
): DashboardMetaDto {
  return {
    range: range.range || '30d',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    calculatedAt: new Date().toISOString()
  };
}

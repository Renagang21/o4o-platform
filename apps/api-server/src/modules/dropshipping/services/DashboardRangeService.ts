/**
 * DashboardRangeService
 * Phase B-4 - Date range parsing for dashboard queries
 */

export interface ParsedDateRange {
  startDate: Date;
  endDate: Date;
  range: string;
}

export interface DateRangeQuery {
  from?: Date | string;
  to?: Date | string;
  range?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

class DashboardRangeService {
  /**
   * Parse date range query into start and end dates
   */
  parseDateRange(query: DateRangeQuery = {}): ParsedDateRange {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();
    let range: string;

    // Helper to convert string to Date if needed
    const toDate = (value: Date | string | undefined, defaultValue: Date): Date => {
      if (!value) return defaultValue;
      return typeof value === 'string' ? new Date(value) : value;
    };

    if (query.from || query.to) {
      // Custom range
      startDate = toDate(query.from, new Date('2020-01-01'));
      endDate = toDate(query.to, new Date());
      range = 'custom';
    } else {
      // Preset range
      switch (query.range) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          range = 'today';
          break;

        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
          endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
          range = 'yesterday';
          break;

        case 'last7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          range = 'last7days';
          break;

        case 'last30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          range = 'last30days';
          break;

        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          range = 'thisMonth';
          break;

        case 'lastMonth':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          startDate = lastMonth;
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          range = 'lastMonth';
          break;

        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          range = 'week';
          break;

        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          range = 'month';
          break;

        case 'quarter':
          const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterMonth, 1);
          range = 'quarter';
          break;

        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          range = 'year';
          break;

        default:
          // Default: last 30 days
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          range = '30d';
      }
    }

    return { startDate, endDate, range };
  }
}

export const dashboardRangeService = new DashboardRangeService();

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
  from?: Date;
  to?: Date;
  range?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
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

    if (query.from || query.to) {
      // Custom range
      startDate = query.from || new Date('2020-01-01');
      endDate = query.to || new Date();
      range = 'custom';
    } else {
      // Preset range
      switch (query.range) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          range = 'today';
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

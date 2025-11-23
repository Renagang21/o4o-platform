/**
 * R-6-2: Dashboard Range Service
 * Provides standardized date range calculation for all dashboard APIs
 *
 * Purpose: Unify period/range/from/to logic across Seller/Supplier/Partner dashboards
 */

import { DashboardDateRange, createDashboardError } from '../dto/dashboard.dto.js';

export interface ParsedDateRange {
  startDate: Date;
  endDate: Date;
  range: '7d' | '30d' | '90d' | '1y' | 'custom';
}

export class DashboardRangeService {
  /**
   * Parse date range from query parameters
   * Supports both old formats and new standard format
   */
  parseDateRange(query: any): ParsedDateRange {
    // Priority 1: New standard format (range + start/end)
    if (query.range) {
      return this.parseStandardRange(query);
    }

    // Priority 2: Legacy Seller format (from + to)
    if (query.from || query.to) {
      return this.parseLegacyFromTo(query);
    }

    // Priority 3: Legacy Supplier format (period)
    if (query.period) {
      return this.parseLegacyPeriod(query);
    }

    // Default: 30 days
    return this.calculatePresetRange('30d');
  }

  /**
   * Parse new standard range format
   * ?range=7d or ?range=custom&start=2025-01-01&end=2025-01-31
   */
  private parseStandardRange(query: any): ParsedDateRange {
    const range = query.range as string;

    // Validate range value
    const validRanges = ['7d', '30d', '90d', '1y', 'custom'];
    if (!validRanges.includes(range)) {
      throw createDashboardError(
        'INVALID_RANGE',
        `Invalid range value: ${range}. Must be one of: ${validRanges.join(', ')}`
      );
    }

    // Handle custom range
    if (range === 'custom') {
      if (!query.start || !query.end) {
        throw createDashboardError(
          'INVALID_PARAMS',
          'Custom range requires both start and end parameters'
        );
      }

      const startDate = new Date(query.start);
      const endDate = new Date(query.end);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw createDashboardError(
          'INVALID_PARAMS',
          'Invalid date format. Use ISO8601 format (YYYY-MM-DD)'
        );
      }

      if (startDate > endDate) {
        throw createDashboardError(
          'INVALID_PARAMS',
          'Start date must be before end date'
        );
      }

      return {
        startDate,
        endDate,
        range: 'custom'
      };
    }

    // Handle preset ranges
    return this.calculatePresetRange(range as '7d' | '30d' | '90d' | '1y');
  }

  /**
   * Parse legacy Seller format (from/to)
   * ?from=2025-01-01T00:00:00Z&to=2025-01-31T23:59:59Z
   */
  private parseLegacyFromTo(query: any): ParsedDateRange {
    const now = new Date();
    const from = query.from ? new Date(query.from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(query.to) : now;

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw createDashboardError(
        'INVALID_PARAMS',
        'Invalid date format in from/to parameters'
      );
    }

    // Determine which preset range this corresponds to (best guess)
    const daysDiff = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    let range: '7d' | '30d' | '90d' | '1y' | 'custom' = 'custom';

    if (daysDiff <= 7) range = '7d';
    else if (daysDiff <= 30) range = '30d';
    else if (daysDiff <= 90) range = '90d';
    else if (daysDiff <= 365) range = '1y';

    return {
      startDate: from,
      endDate: to,
      range
    };
  }

  /**
   * Parse legacy Supplier format (period)
   * ?period=7d or ?period=30d
   */
  private parseLegacyPeriod(query: any): ParsedDateRange {
    const period = query.period as string;

    // Map period to standard range
    const rangeMap: Record<string, '7d' | '30d' | '90d' | '1y'> = {
      '7d': '7d',
      '30d': '30d',
      '90d': '90d',
      '1y': '1y',
      'week': '7d',
      'month': '30d',
      'quarter': '90d',
      'year': '1y'
    };

    const range = rangeMap[period] || '30d';
    return this.calculatePresetRange(range);
  }

  /**
   * Calculate date range for preset ranges (7d, 30d, etc.)
   */
  private calculatePresetRange(range: '7d' | '30d' | '90d' | '1y'): ParsedDateRange {
    const now = new Date();
    const endDate = new Date(now);
    const startDate = new Date(now);

    switch (range) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return {
      startDate,
      endDate,
      range
    };
  }

  /**
   * Validate date range constraints
   * Ensures range is not too large to prevent performance issues
   */
  validateRange(startDate: Date, endDate: Date, maxDays: number = 365): void {
    const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > maxDays) {
      throw createDashboardError(
        'INVALID_RANGE',
        `Date range too large. Maximum allowed is ${maxDays} days.`
      );
    }

    if (daysDiff < 0) {
      throw createDashboardError(
        'INVALID_PARAMS',
        'Start date must be before end date'
      );
    }
  }

  /**
   * Convert date range to TypeORM Between filter
   */
  toTypeORMBetween(parsed: ParsedDateRange): { from: Date; to: Date } {
    return {
      from: parsed.startDate,
      to: parsed.endDate
    };
  }

  /**
   * Convert date range to SQL WHERE clause
   */
  toSQLWhere(parsed: ParsedDateRange, columnName: string = 'created_at'): string {
    return `${columnName} >= '${parsed.startDate.toISOString()}' AND ${columnName} <= '${parsed.endDate.toISOString()}'`;
  }
}

// Singleton instance
export const dashboardRangeService = new DashboardRangeService();

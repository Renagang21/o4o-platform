import { Injectable } from '@nestjs/common';
import { AdvancedQueryParams } from './AdvancedQueryService';

export interface ComplexityAnalysis {
  complexity: number;
  estimatedTime: number; // in milliseconds
  warnings: string[];
  suggestions: string[];
  breakdown: {
    base: number;
    expands: number;
    conditions: number;
    sorts: number;
    aggregates: number;
  };
}

@Injectable()
export class QueryComplexityAnalyzer {
  private readonly COMPLEXITY_WEIGHTS = {
    base: 10,
    expand: 20,
    nestedExpand: 10,
    condition: 5,
    sort: 5,
    aggregate: 10,
    limit: 0.1
  };

  private readonly TIME_ESTIMATES = {
    base: 50, // ms
    expand: 100,
    nestedExpand: 50,
    condition: 10,
    sort: 20,
    aggregate: 30
  };

  private readonly THRESHOLDS = {
    complexity: {
      low: 30,
      medium: 60,
      high: 90
    },
    expands: 5,
    conditions: 20,
    sorts: 3,
    limit: 100
  };

  async analyze(params: AdvancedQueryParams): Promise<ComplexityAnalysis> {
    const breakdown = this.calculateBreakdown(params);
    const complexity = this.calculateTotalComplexity(breakdown);
    const estimatedTime = this.estimateExecutionTime(params);
    const warnings = this.generateWarnings(params, complexity);
    const suggestions = this.generateSuggestions(params, complexity);

    return {
      complexity: Math.min(complexity, 100), // Cap at 100
      estimatedTime,
      warnings,
      suggestions,
      breakdown
    };
  }

  private calculateBreakdown(params: AdvancedQueryParams): ComplexityAnalysis['breakdown'] {
    let expandComplexity = 0;
    let conditionComplexity = 0;
    let sortComplexity = 0;
    let aggregateComplexity = 0;

    // Calculate expand complexity
    if (params.expand) {
      for (const expand of params.expand) {
        expandComplexity += this.COMPLEXITY_WEIGHTS.expand;
        // Add extra complexity for nested expands
        const depth = expand.split('.').length - 1;
        expandComplexity += depth * this.COMPLEXITY_WEIGHTS.nestedExpand;
      }
    }

    // Calculate condition complexity
    if (params.where) {
      conditionComplexity = this.countConditions(params.where) * this.COMPLEXITY_WEIGHTS.condition;
    }

    // Calculate sort complexity
    if (params.sort) {
      sortComplexity = params.sort.length * this.COMPLEXITY_WEIGHTS.sort;
    }

    // Calculate aggregate complexity
    if (params.aggregate) {
      if (params.aggregate.count) {
        aggregateComplexity += this.COMPLEXITY_WEIGHTS.aggregate;
      }
      if (params.aggregate.sum) {
        aggregateComplexity += params.aggregate.sum.length * this.COMPLEXITY_WEIGHTS.aggregate;
      }
      if (params.aggregate.avg) {
        aggregateComplexity += params.aggregate.avg.length * this.COMPLEXITY_WEIGHTS.aggregate;
      }
    }

    return {
      base: this.COMPLEXITY_WEIGHTS.base,
      expands: expandComplexity,
      conditions: conditionComplexity,
      sorts: sortComplexity,
      aggregates: aggregateComplexity
    };
  }

  private calculateTotalComplexity(breakdown: ComplexityAnalysis['breakdown']): number {
    return Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  }

  private estimateExecutionTime(params: AdvancedQueryParams): number {
    let time = this.TIME_ESTIMATES.base;

    // Add time for expands
    if (params.expand) {
      for (const expand of params.expand) {
        time += this.TIME_ESTIMATES.expand;
        const depth = expand.split('.').length - 1;
        time += depth * this.TIME_ESTIMATES.nestedExpand;
      }
    }

    // Add time for conditions
    if (params.where) {
      const conditions = this.countConditions(params.where);
      time += conditions * this.TIME_ESTIMATES.condition;
    }

    // Add time for sorts
    if (params.sort) {
      time += params.sort.length * this.TIME_ESTIMATES.sort;
    }

    // Add time for aggregates
    if (params.aggregate) {
      if (params.aggregate.count) {
        time += this.TIME_ESTIMATES.aggregate;
      }
      if (params.aggregate.sum) {
        time += params.aggregate.sum.length * this.TIME_ESTIMATES.aggregate;
      }
      if (params.aggregate.avg) {
        time += params.aggregate.avg.length * this.TIME_ESTIMATES.aggregate;
      }
    }

    // Adjust for limit
    const limit = params.page?.limit || 10;
    time *= (1 + (limit / 100)); // Scale time based on result size

    return Math.round(time);
  }

  private generateWarnings(params: AdvancedQueryParams, complexity: number): string[] {
    const warnings: string[] = [];

    // Complexity warnings
    if (complexity >= this.THRESHOLDS.complexity.high) {
      warnings.push('Query complexity is very high. Consider simplifying the query.');
    } else if (complexity >= this.THRESHOLDS.complexity.medium) {
      warnings.push('Query complexity is moderate. Monitor performance in production.');
    }

    // Expand warnings
    if (params.expand) {
      if (params.expand.length > this.THRESHOLDS.expands) {
        warnings.push(`Too many expands (${params.expand.length}). Consider reducing to ${this.THRESHOLDS.expands} or less.`);
      }

      // Check for deep nesting
      const maxDepth = Math.max(...params.expand.map(e => e.split('.').length));
      if (maxDepth > 3) {
        warnings.push(`Deep expand nesting detected (${maxDepth} levels). This may cause performance issues.`);
      }

      // Check for potential N+1 issues
      const hasMultipleExpands = params.expand.some(e =>
        ['comments', 'reviews', 'children', 'related'].includes(e.split('.')[0])
      );
      if (hasMultipleExpands) {
        warnings.push('Multiple collection expands detected. DataLoader will be used to prevent N+1 queries.');
      }
    }

    // Condition warnings
    if (params.where) {
      const conditions = this.countConditions(params.where);
      if (conditions > this.THRESHOLDS.conditions) {
        warnings.push(`Too many conditions (${conditions}). Consider simplifying the filter.`);
      }

      // Check for OR conditions
      if (this.hasOrConditions(params.where)) {
        warnings.push('OR conditions can impact performance. Ensure proper indexing.');
      }
    }

    // Sort warnings
    if (params.sort && params.sort.length > this.THRESHOLDS.sorts) {
      warnings.push(`Too many sort fields (${params.sort.length}). Consider limiting to ${this.THRESHOLDS.sorts}.`);
    }

    // Pagination warnings
    if (params.page?.limit && params.page.limit > this.THRESHOLDS.limit) {
      warnings.push(`High page limit (${params.page.limit}). Consider paginating with smaller limits.`);
    }

    // Cache warnings
    if (!params.cache || params.cache.ttl === 0) {
      if (complexity >= this.THRESHOLDS.complexity.medium) {
        warnings.push('Complex query without caching. Consider enabling cache for better performance.');
      }
    }

    return warnings;
  }

  private generateSuggestions(params: AdvancedQueryParams, complexity: number): string[] {
    const suggestions: string[] = [];

    // Cache suggestions
    if (!params.cache && complexity >= this.THRESHOLDS.complexity.medium) {
      suggestions.push('Enable caching with appropriate TTL for this query.');
    }

    // Expand suggestions
    if (params.expand && params.expand.length > 3) {
      suggestions.push('Consider splitting into multiple queries or using GraphQL for complex data requirements.');
    }

    // Pagination suggestions
    if (!params.page?.cursor && params.page?.limit && params.page.limit > 20) {
      suggestions.push('Use cursor-based pagination for better performance with large datasets.');
    }

    // Index suggestions
    if (params.sort) {
      const sortFields = params.sort.map(s => s.field);
      suggestions.push(`Ensure indexes exist for sort fields: ${sortFields.join(', ')}`);
    }

    // Filter suggestions
    if (params.where) {
      const hasRangeQueries = this.hasRangeQueries(params.where);
      if (hasRangeQueries) {
        suggestions.push('Range queries detected. Ensure proper indexing for range fields.');
      }

      const hasTextSearch = this.hasTextSearch(params.where);
      if (hasTextSearch) {
        suggestions.push('Text search detected. Consider using full-text search indexes.');
      }
    }

    // Aggregate suggestions
    if (params.aggregate && Object.keys(params.aggregate).length > 2) {
      suggestions.push('Multiple aggregations requested. Consider using a dedicated analytics query.');
    }

    // General performance suggestions
    if (complexity >= this.THRESHOLDS.complexity.high) {
      suggestions.push('Consider creating a dedicated view or materialized query for this complex operation.');
      suggestions.push('Monitor query performance in production and adjust indexes as needed.');
    }

    return suggestions;
  }

  private countConditions(where: any): number {
    let count = 0;

    if (where.AND) {
      count += where.AND.length;
      for (const condition of where.AND) {
        count += this.countConditions(condition);
      }
    }

    if (where.OR) {
      count += where.OR.length;
      for (const condition of where.OR) {
        count += this.countConditions(condition);
      }
    }

    // Count field conditions
    Object.keys(where).forEach(key => {
      if (key !== 'AND' && key !== 'OR') {
        count++;
      }
    });

    return count;
  }

  private hasOrConditions(where: any): boolean {
    if (where.OR) {
      return true;
    }

    if (where.AND) {
      for (const condition of where.AND) {
        if (this.hasOrConditions(condition)) {
          return true;
        }
      }
    }

    return false;
  }

  private hasRangeQueries(where: any): boolean {
    for (const [key, value] of Object.entries(where)) {
      if (key === 'AND' || key === 'OR') {
        const conditions = where[key];
        for (const condition of conditions) {
          if (this.hasRangeQueries(condition)) {
            return true;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        if ('gt' in value || 'gte' in value || 'lt' in value || 'lte' in value || 'between' in value) {
          return true;
        }
      }
    }
    return false;
  }

  private hasTextSearch(where: any): boolean {
    for (const [key, value] of Object.entries(where)) {
      if (key === 'AND' || key === 'OR') {
        const conditions = where[key];
        for (const condition of conditions) {
          if (this.hasTextSearch(condition)) {
            return true;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        if ('like' in value || 'contains' in value || 'startsWith' in value || 'endsWith' in value) {
          return true;
        }
      }
    }
    return false;
  }

  // Method to suggest optimal query structure
  optimizeQuery(params: AdvancedQueryParams): AdvancedQueryParams {
    const optimized = { ...params };

    // Optimize expand order (shallow before deep)
    if (optimized.expand) {
      optimized.expand.sort((a, b) => {
        const depthA = a.split('.').length;
        const depthB = b.split('.').length;
        return depthA - depthB;
      });
    }

    // Optimize sort order (indexed fields first)
    // This would require knowledge of indexes

    // Suggest reasonable limits
    if (!optimized.page) {
      optimized.page = { limit: 10 };
    } else if (!optimized.page.limit) {
      optimized.page.limit = 10;
    } else if (optimized.page.limit > 100) {
      optimized.page.limit = 100;
    }

    // Enable caching for complex queries
    if (!optimized.cache) {
      const complexity = this.calculateTotalComplexity(this.calculateBreakdown(optimized));
      if (complexity >= this.THRESHOLDS.complexity.medium) {
        optimized.cache = { ttl: 300 }; // 5 minutes default
      }
    }

    return optimized;
  }
}
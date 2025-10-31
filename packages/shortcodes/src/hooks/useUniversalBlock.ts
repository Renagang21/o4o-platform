import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { z } from 'zod';

// Types for Universal Block
export interface UniversalBlockProps {
  source: string;
  expand?: string[];
  where?: WhereClause | AndClause | OrClause;
  sort?: SortClause[];
  limit?: number;
  cursor?: string;
  aggregate?: AggregateOptions;
  cache?: CacheOptions;
  enabled?: boolean;
}

export interface WhereClause {
  [field: string]: any | OperatorClause;
}

export interface OperatorClause {
  eq?: any;
  ne?: any;
  gt?: any;
  gte?: any;
  lt?: any;
  lte?: any;
  between?: [any, any];
  in?: any[];
  notIn?: any[];
  like?: string;
  notLike?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
}

export interface AndClause {
  AND: WhereClause[];
}

export interface OrClause {
  OR: WhereClause[];
}

export interface SortClause {
  field: string;
  order: 'ASC' | 'DESC';
}

export interface AggregateOptions {
  count?: boolean;
  sum?: string[];
  avg?: string[];
  min?: string[];
  max?: string[];
}

export interface CacheOptions {
  ttl?: number; // in seconds
  key?: string;
  tags?: string[];
}

export interface UniversalBlockResult<T = any> {
  data: T[];
  meta: {
    total?: number;
    cursor?: {
      next?: string;
      prev?: string;
    };
    aggregates?: Record<string, any>;
    query: {
      executionTime: number;
      cached: boolean;
      complexity: number;
    };
  };
}

export interface UseUniversalBlockOptions<T = any>
  extends Omit<UseQueryOptions<UniversalBlockResult<T>, Error>, 'queryKey' | 'queryFn'> {
  onComplexityWarning?: (complexity: number) => void;
  transformData?: (data: any[]) => T[];
}

// Query key generator
function generateQueryKey(props: UniversalBlockProps): string[] {
  const key = [
    'universal-block',
    props.source,
    JSON.stringify({
      expand: props.expand,
      where: props.where,
      sort: props.sort,
      limit: props.limit,
      cursor: props.cursor,
      aggregate: props.aggregate
    })
  ];

  return key.filter(Boolean);
}

// Main hook
export function useUniversalBlock<T = any>(
  props: UniversalBlockProps,
  options?: UseUniversalBlockOptions<T>
): UseQueryResult<UniversalBlockResult<T>, Error> {
  const queryKey = generateQueryKey(props);

  return useQuery<UniversalBlockResult<T>, Error>({
    queryKey,
    queryFn: async () => {
      // Build request parameters
      const params = {
        source: props.source,
        expand: props.expand,
        where: props.where,
        sort: props.sort,
        page: {
          limit: props.limit || 10,
          cursor: props.cursor
        },
        aggregate: props.aggregate,
        cache: props.cache
      };

      // Execute query
      const response = await authClient.api.post('/api/v2/data/query', params);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Query failed');
      }

      // Check complexity warning
      if (options?.onComplexityWarning && response.data.meta?.query?.complexity) {
        const complexity = response.data.meta.query.complexity;
        if (complexity > 80) {
          options.onComplexityWarning(complexity);
        }
      }

      // Transform data if needed
      let data = response.data.data;
      if (options?.transformData) {
        data = options.transformData(data);
      }

      return {
        data,
        meta: response.data.meta
      };
    },
    enabled: props.enabled !== false,
    staleTime: props.cache?.ttl ? props.cache.ttl * 1000 : 5 * 60 * 1000, // Default 5 minutes
    gcTime: props.cache?.ttl ? props.cache.ttl * 2000 : 10 * 60 * 1000, // Default 10 minutes
    refetchOnWindowFocus: false,
    ...options
  });
}

// Helper functions for building queries
export const QueryBuilder = {
  // Where clause builders
  where: {
    eq: (field: string, value: any): WhereClause => ({ [field]: value }),
    ne: (field: string, value: any): WhereClause => ({ [field]: { ne: value } }),
    gt: (field: string, value: any): WhereClause => ({ [field]: { gt: value } }),
    gte: (field: string, value: any): WhereClause => ({ [field]: { gte: value } }),
    lt: (field: string, value: any): WhereClause => ({ [field]: { lt: value } }),
    lte: (field: string, value: any): WhereClause => ({ [field]: { lte: value } }),
    between: (field: string, min: any, max: any): WhereClause => ({
      [field]: { between: [min, max] }
    }),
    in: (field: string, values: any[]): WhereClause => ({ [field]: { in: values } }),
    notIn: (field: string, values: any[]): WhereClause => ({ [field]: { notIn: values } }),
    like: (field: string, pattern: string): WhereClause => ({ [field]: { like: pattern } }),
    contains: (field: string, text: string): WhereClause => ({ [field]: { contains: text } }),
    startsWith: (field: string, text: string): WhereClause => ({ [field]: { startsWith: text } }),
    endsWith: (field: string, text: string): WhereClause => ({ [field]: { endsWith: text } }),
    and: (...conditions: WhereClause[]): AndClause => ({ AND: conditions }),
    or: (...conditions: WhereClause[]): OrClause => ({ OR: conditions })
  },

  // Sort builders
  sort: {
    asc: (field: string): SortClause => ({ field, order: 'ASC' }),
    desc: (field: string): SortClause => ({ field, order: 'DESC' })
  },

  // Aggregate builders
  aggregate: {
    count: (): AggregateOptions => ({ count: true }),
    sum: (...fields: string[]): AggregateOptions => ({ sum: fields }),
    avg: (...fields: string[]): AggregateOptions => ({ avg: fields }),
    all: (fields: { sum?: string[]; avg?: string[]; count?: boolean }): AggregateOptions => fields
  }
};

// Preset hook for common queries
export function useUniversalBlockPreset(
  presetName: string,
  overrides?: Partial<UniversalBlockProps>,
  options?: UseUniversalBlockOptions
) {
  // Load preset configuration
  const presetConfig = getPresetConfig(presetName);

  // Merge with overrides
  const props: UniversalBlockProps = {
    ...presetConfig,
    ...overrides
  };

  return useUniversalBlock(props, options);
}

// Helper to get preset configurations
function getPresetConfig(presetName: string): UniversalBlockProps {
  const presets: Record<string, UniversalBlockProps> = {
    'recent-posts': {
      source: 'post',
      expand: ['author', 'category', 'tags'],
      where: QueryBuilder.where.eq('status', 'published'),
      sort: [QueryBuilder.sort.desc('createdAt')],
      limit: 10
    },
    'featured-products': {
      source: 'product',
      expand: ['media', 'category'],
      where: QueryBuilder.where.and(
        QueryBuilder.where.eq('status', 'published'),
        QueryBuilder.where.eq('featured', true)
      ),
      sort: [QueryBuilder.sort.desc('rating'), QueryBuilder.sort.desc('createdAt')],
      limit: 8
    },
    'user-comments': {
      source: 'comment',
      expand: ['author', 'post'],
      sort: [QueryBuilder.sort.desc('createdAt')],
      limit: 20
    }
  };

  if (!presets[presetName]) {
    throw new Error(`Preset '${presetName}' not found`);
  }

  return presets[presetName];
}

// Hook for analyzing query complexity
export function useQueryComplexity(props: UniversalBlockProps) {
  return useQuery({
    queryKey: ['query-complexity', props],
    queryFn: async () => {
      const response = await authClient.api.post('/api/v2/data/analyze', {
        source: props.source,
        expand: props.expand,
        where: props.where,
        sort: props.sort,
        page: { limit: props.limit },
        aggregate: props.aggregate
      });

      return response.data;
    },
    staleTime: 60 * 60 * 1000 // 1 hour
  });
}

// Hook for validating query
export function useQueryValidation(props: UniversalBlockProps) {
  return useQuery({
    queryKey: ['query-validation', props],
    queryFn: async () => {
      const response = await authClient.api.post('/api/v2/data/validate', {
        source: props.source,
        expand: props.expand,
        where: props.where,
        sort: props.sort,
        page: { limit: props.limit },
        aggregate: props.aggregate
      });

      return response.data;
    },
    staleTime: 60 * 60 * 1000 // 1 hour
  });
}

// Export everything
export default useUniversalBlock;
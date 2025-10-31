import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { z } from 'zod';
import { QuerySecurityValidator } from '../security/QuerySecurityValidator';
import { PresetDataLoader } from '../loaders/PresetDataLoader';
import { RedisCache } from '../cache/RedisCache';
import { PostEntity } from '../entities/post.entity';
import { MetaEntity } from '../entities/meta.entity';

// Advanced Query Parameters Schema
export const AdvancedQueryParamsSchema = z.object({
  source: z.string().min(1),
  expand: z.array(z.string()).optional(),
  where: z.any().optional(), // Will be validated by SecurityValidator
  sort: z.array(z.object({
    field: z.string(),
    order: z.enum(['ASC', 'DESC'])
  })).optional(),
  page: z.object({
    limit: z.number().min(1).max(100).default(10),
    cursor: z.string().optional()
  }).optional(),
  aggregate: z.object({
    count: z.boolean().optional(),
    sum: z.array(z.string()).optional(),
    avg: z.array(z.string()).optional()
  }).optional(),
  cache: z.object({
    ttl: z.number().min(0).max(3600).optional(),
    key: z.string().optional()
  }).optional()
});

export type AdvancedQueryParams = z.infer<typeof AdvancedQueryParamsSchema>;

export interface QueryResult {
  data: any[];
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

@Injectable()
export class AdvancedQueryService {
  constructor(
    @InjectRepository(PostEntity)
    private postRepository: Repository<PostEntity>,
    @InjectRepository(MetaEntity)
    private metaRepository: Repository<MetaEntity>,
    private dataLoader: PresetDataLoader,
    private validator: QuerySecurityValidator,
    private cache: RedisCache
  ) {}

  async executeQuery(params: AdvancedQueryParams, userId?: string, tenantId?: string): Promise<QueryResult> {
    const startTime = Date.now();

    // 1. Validate and sanitize parameters
    const validatedParams = await this.validateParams(params);

    // 2. Security validation
    await this.validator.validate(validatedParams, userId, tenantId);

    // 3. Check cache
    const cacheKey = this.generateCacheKey(validatedParams, userId, tenantId);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        meta: {
          ...cached.meta,
          query: {
            ...cached.meta.query,
            cached: true
          }
        }
      };
    }

    // 4. Calculate query complexity
    const complexity = this.calculateComplexity(validatedParams);

    // 5. Build and execute query
    const queryBuilder = await this.buildQuery(validatedParams, tenantId);

    // 6. Apply pagination
    const paginatedData = await this.applyPagination(queryBuilder, validatedParams.page);

    // 7. Load relations with DataLoader
    if (validatedParams.expand && validatedParams.expand.length > 0) {
      await this.loadRelations(paginatedData.data, validatedParams.expand);
    }

    // 8. Calculate aggregates
    const aggregates = validatedParams.aggregate
      ? await this.calculateAggregates(validatedParams)
      : undefined;

    // 9. Prepare result
    const result: QueryResult = {
      data: paginatedData.data,
      meta: {
        total: paginatedData.total,
        cursor: paginatedData.cursor,
        aggregates,
        query: {
          executionTime: Date.now() - startTime,
          cached: false,
          complexity
        }
      }
    };

    // 10. Cache result
    const ttl = validatedParams.cache?.ttl || 300;
    await this.cache.set(cacheKey, result, ttl);

    return result;
  }

  private async validateParams(params: any): Promise<AdvancedQueryParams> {
    try {
      return AdvancedQueryParamsSchema.parse(params);
    } catch (error) {
      throw new Error(`Invalid query parameters: ${error.message}`);
    }
  }

  private generateCacheKey(params: AdvancedQueryParams, userId?: string, tenantId?: string): string {
    const keyParts = [
      'query',
      params.source,
      JSON.stringify(params.where || {}),
      JSON.stringify(params.sort || []),
      JSON.stringify(params.expand || []),
      params.page?.limit,
      params.page?.cursor,
      userId,
      tenantId
    ].filter(Boolean);

    return keyParts.join(':');
  }

  private calculateComplexity(params: AdvancedQueryParams): number {
    let complexity = 10; // Base complexity

    // Add complexity for expands
    if (params.expand) {
      complexity += params.expand.length * 20;
      // Nested expands add more complexity
      params.expand.forEach(exp => {
        if (exp.includes('.')) {
          complexity += exp.split('.').length * 10;
        }
      });
    }

    // Add complexity for where conditions
    if (params.where) {
      const conditions = JSON.stringify(params.where).match(/AND|OR/g);
      complexity += (conditions?.length || 0) * 5;
    }

    // Add complexity for sorts
    if (params.sort) {
      complexity += params.sort.length * 5;
    }

    // Add complexity for aggregates
    if (params.aggregate) {
      if (params.aggregate.count) complexity += 5;
      if (params.aggregate.sum) complexity += params.aggregate.sum.length * 10;
      if (params.aggregate.avg) complexity += params.aggregate.avg.length * 10;
    }

    return Math.min(complexity, 100); // Cap at 100
  }

  private async buildQuery(params: AdvancedQueryParams, tenantId?: string): Promise<SelectQueryBuilder<PostEntity>> {
    const qb = this.postRepository.createQueryBuilder('post');

    // Apply source filter
    qb.where('post.postType = :source', { source: params.source });

    // Apply tenant filter if needed
    if (tenantId) {
      qb.andWhere('post.tenantId = :tenantId', { tenantId });
    }

    // Apply where conditions
    if (params.where) {
      await this.applyWhereConditions(qb, params.where);
    }

    // Apply sorting
    if (params.sort && params.sort.length > 0) {
      params.sort.forEach((sort, index) => {
        if (index === 0) {
          qb.orderBy(`post.${sort.field}`, sort.order);
        } else {
          qb.addOrderBy(`post.${sort.field}`, sort.order);
        }
      });
    } else {
      qb.orderBy('post.createdAt', 'DESC');
    }

    return qb;
  }

  private async applyWhereConditions(qb: SelectQueryBuilder<PostEntity>, where: any): Promise<void> {
    // This is a simplified implementation
    // In production, this should handle complex nested conditions
    if (where.AND) {
      where.AND.forEach((condition: any) => {
        Object.entries(condition).forEach(([field, value]) => {
          if (typeof value === 'object' && value !== null) {
            // Handle operators
            if (value.gt) {
              qb.andWhere(`post.${field} > :${field}_gt`, { [`${field}_gt`]: value.gt });
            }
            if (value.lt) {
              qb.andWhere(`post.${field} < :${field}_lt`, { [`${field}_lt`]: value.lt });
            }
            if (value.between) {
              qb.andWhere(`post.${field} BETWEEN :${field}_start AND :${field}_end`, {
                [`${field}_start`]: value.between[0],
                [`${field}_end`]: value.between[1]
              });
            }
            if (value.in) {
              qb.andWhere(`post.${field} IN (:...${field}_in)`, { [`${field}_in`]: value.in });
            }
          } else {
            qb.andWhere(`post.${field} = :${field}`, { [field]: value });
          }
        });
      });
    }

    if (where.OR) {
      const orConditions = where.OR.map((condition: any, index: number) => {
        const conditions: string[] = [];
        const parameters: Record<string, any> = {};

        Object.entries(condition).forEach(([field, value]) => {
          conditions.push(`post.${field} = :${field}_or_${index}`);
          parameters[`${field}_or_${index}`] = value;
        });

        return { sql: conditions.join(' AND '), parameters };
      });

      const orSql = orConditions.map(c => `(${c.sql})`).join(' OR ');
      const allParams = orConditions.reduce((acc, c) => ({ ...acc, ...c.parameters }), {});

      qb.andWhere(`(${orSql})`, allParams);
    }
  }

  private async applyPagination(
    qb: SelectQueryBuilder<PostEntity>,
    page?: { limit?: number; cursor?: string }
  ): Promise<{ data: any[]; total: number; cursor?: { next?: string; prev?: string } }> {
    const limit = page?.limit || 10;

    // Get total count
    const total = await qb.getCount();

    // Apply cursor-based pagination
    if (page?.cursor) {
      const decodedCursor = this.decodeCursor(page.cursor);
      qb.andWhere('post.id > :cursor', { cursor: decodedCursor.id });
    }

    // Apply limit
    qb.limit(limit + 1); // Get one extra to check if there's a next page

    const results = await qb.getMany();
    const hasNext = results.length > limit;
    const data = hasNext ? results.slice(0, limit) : results;

    const cursor: any = {};
    if (hasNext) {
      cursor.next = this.encodeCursor({ id: data[data.length - 1].id });
    }
    if (page?.cursor) {
      cursor.prev = page.cursor; // Simplified - in production, calculate actual previous cursor
    }

    return { data, total, cursor };
  }

  private async loadRelations(data: any[], expand: string[]): Promise<void> {
    for (const item of data) {
      for (const relation of expand) {
        if (relation.includes('.')) {
          // Handle nested relations
          const parts = relation.split('.');
          await this.loadNestedRelation(item, parts);
        } else {
          // Load direct relation
          const relatedData = await this.dataLoader.load(relation, item.id);
          item[relation] = relatedData;
        }
      }
    }
  }

  private async loadNestedRelation(item: any, parts: string[]): Promise<void> {
    let current = item;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (i === parts.length - 1) {
        // Last part - load the relation
        if (current && current.id) {
          const relatedData = await this.dataLoader.load(part, current.id);
          current[part] = relatedData;
        }
      } else {
        // Intermediate part - load and continue
        if (current && current.id) {
          const relatedData = await this.dataLoader.load(part, current.id);
          current[part] = relatedData;
          current = relatedData;
        } else {
          break; // Cannot continue if no data
        }
      }
    }
  }

  private async calculateAggregates(params: AdvancedQueryParams): Promise<Record<string, any>> {
    const aggregates: Record<string, any> = {};

    if (params.aggregate?.count) {
      const qb = this.postRepository.createQueryBuilder('post');
      qb.where('post.postType = :source', { source: params.source });
      if (params.where) {
        await this.applyWhereConditions(qb, params.where);
      }
      aggregates.count = await qb.getCount();
    }

    if (params.aggregate?.sum) {
      for (const field of params.aggregate.sum) {
        const qb = this.postRepository.createQueryBuilder('post');
        qb.where('post.postType = :source', { source: params.source });
        if (params.where) {
          await this.applyWhereConditions(qb, params.where);
        }
        qb.select(`SUM(post.${field})`, 'sum');
        const result = await qb.getRawOne();
        aggregates[`sum_${field}`] = result.sum || 0;
      }
    }

    if (params.aggregate?.avg) {
      for (const field of params.aggregate.avg) {
        const qb = this.postRepository.createQueryBuilder('post');
        qb.where('post.postType = :source', { source: params.source });
        if (params.where) {
          await this.applyWhereConditions(qb, params.where);
        }
        qb.select(`AVG(post.${field})`, 'avg');
        const result = await qb.getRawOne();
        aggregates[`avg_${field}`] = result.avg || 0;
      }
    }

    return aggregates;
  }

  private encodeCursor(data: any): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  private decodeCursor(cursor: string): any {
    return JSON.parse(Buffer.from(cursor, 'base64').toString());
  }
}
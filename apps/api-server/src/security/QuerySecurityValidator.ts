import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdvancedQueryParams } from '../services/AdvancedQueryService';

export interface AllowListConfig {
  fields: string[];
  relations: string[];
  operators: string[];
  sources: string[];
  aggregates: string[];
}

export interface RateLimitConfig {
  maxComplexity: number;
  maxExpands: number;
  maxConditions: number;
  maxSorts: number;
  maxLimit: number;
}

@Injectable()
export class QuerySecurityValidator {
  private allowList: AllowListConfig;
  private rateLimit: RateLimitConfig;
  private sensitiveFields: Set<string>;

  constructor(private configService: ConfigService) {
    this.initializeAllowList();
    this.initializeRateLimit();
    this.initializeSensitiveFields();
  }

  private initializeAllowList(): void {
    this.allowList = {
      fields: [
        'id', 'title', 'content', 'excerpt', 'status', 'slug',
        'createdAt', 'updatedAt', 'publishedAt', 'author', 'authorId',
        'category', 'categoryId', 'tags', 'featured', 'order', 'views',
        'price', 'salePrice', 'sku', 'stock', 'rating', 'reviewCount',
        'metadata', 'acfFields', 'thumbnail', 'images', 'attachments'
      ],
      relations: [
        'author', 'category', 'tags', 'parent', 'children',
        'comments', 'reviews', 'media', 'attachments', 'related',
        'crossSells', 'upSells', 'variations', 'attributes'
      ],
      operators: [
        'eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between', 'in',
        'notIn', 'like', 'notLike', 'contains', 'startsWith', 'endsWith'
      ],
      sources: [
        'post', 'page', 'product', 'event', 'portfolio', 'testimonial',
        'team', 'service', 'faq', 'gallery', 'download', 'announcement'
      ],
      aggregates: [
        'count', 'sum', 'avg', 'min', 'max'
      ]
    };

    // Load custom allow list from config
    const customAllowList = this.configService.get<Partial<AllowListConfig>>('queryAllowList');
    if (customAllowList) {
      this.allowList = {
        fields: [...this.allowList.fields, ...(customAllowList.fields || [])],
        relations: [...this.allowList.relations, ...(customAllowList.relations || [])],
        operators: [...this.allowList.operators, ...(customAllowList.operators || [])],
        sources: [...this.allowList.sources, ...(customAllowList.sources || [])],
        aggregates: [...this.allowList.aggregates, ...(customAllowList.aggregates || [])]
      };
    }
  }

  private initializeRateLimit(): void {
    this.rateLimit = {
      maxComplexity: this.configService.get<number>('queryMaxComplexity', 100),
      maxExpands: this.configService.get<number>('queryMaxExpands', 5),
      maxConditions: this.configService.get<number>('queryMaxConditions', 20),
      maxSorts: this.configService.get<number>('queryMaxSorts', 3),
      maxLimit: this.configService.get<number>('queryMaxLimit', 100)
    };
  }

  private initializeSensitiveFields(): void {
    this.sensitiveFields = new Set([
      'password', 'passwordHash', 'apiKey', 'apiSecret', 'token',
      'refreshToken', 'privateKey', 'secret', 'salt', 'sessionId',
      'creditCard', 'cvv', 'ssn', 'bankAccount', 'routingNumber'
    ]);

    // Load additional sensitive fields from config
    const additionalSensitiveFields = this.configService.get<string[]>('sensistiveFields', []);
    additionalSensitiveFields.forEach(field => this.sensitiveFields.add(field));
  }

  async validate(params: AdvancedQueryParams, userId?: string, tenantId?: string): Promise<void> {
    // 1. Validate source
    this.validateSource(params.source);

    // 2. Validate expand relations
    if (params.expand) {
      this.validateExpands(params.expand);
    }

    // 3. Validate where conditions
    if (params.where) {
      this.validateWhereConditions(params.where);
    }

    // 4. Validate sort fields
    if (params.sort) {
      this.validateSortFields(params.sort);
    }

    // 5. Validate aggregates
    if (params.aggregate) {
      this.validateAggregates(params.aggregate);
    }

    // 6. Check rate limits
    this.checkRateLimits(params);

    // 7. Validate user permissions
    await this.validateUserPermissions(params, userId, tenantId);
  }

  private validateSource(source: string): void {
    if (!this.allowList.sources.includes(source)) {
      throw new ForbiddenException(`Source '${source}' is not allowed`);
    }
  }

  private validateExpands(expands: string[]): void {
    if (expands.length > this.rateLimit.maxExpands) {
      throw new ForbiddenException(`Too many expand relations. Maximum allowed: ${this.rateLimit.maxExpands}`);
    }

    for (const expand of expands) {
      const parts = expand.split('.');

      // Check each part of nested expansion
      for (const part of parts) {
        if (!this.allowList.relations.includes(part)) {
          throw new ForbiddenException(`Relation '${part}' is not allowed`);
        }
      }

      // Limit nesting depth
      if (parts.length > 3) {
        throw new ForbiddenException(`Expand nesting too deep. Maximum depth: 3`);
      }
    }
  }

  private validateWhereConditions(where: any, depth = 0): void {
    if (depth > 5) {
      throw new ForbiddenException('Where condition nesting too deep');
    }

    const conditions = this.countConditions(where);
    if (conditions > this.rateLimit.maxConditions) {
      throw new ForbiddenException(`Too many conditions. Maximum allowed: ${this.rateLimit.maxConditions}`);
    }

    // Recursively validate conditions
    if (where.AND) {
      for (const condition of where.AND) {
        this.validateWhereConditions(condition, depth + 1);
      }
    }

    if (where.OR) {
      for (const condition of where.OR) {
        this.validateWhereConditions(condition, depth + 1);
      }
    }

    // Validate fields and operators
    Object.entries(where).forEach(([field, value]) => {
      if (field !== 'AND' && field !== 'OR') {
        // Check if field is allowed
        if (!this.allowList.fields.includes(field)) {
          throw new ForbiddenException(`Field '${field}' is not allowed in where conditions`);
        }

        // Check for sensitive fields
        if (this.sensitiveFields.has(field)) {
          throw new ForbiddenException(`Field '${field}' contains sensitive data and cannot be queried`);
        }

        // Validate operators if value is an object
        if (typeof value === 'object' && value !== null) {
          Object.keys(value).forEach(operator => {
            if (!this.allowList.operators.includes(operator)) {
              throw new ForbiddenException(`Operator '${operator}' is not allowed`);
            }
          });
        }
      }
    });
  }

  private validateSortFields(sorts: Array<{ field?: string; order?: 'ASC' | 'DESC' }>): void {
    if (sorts.length > this.rateLimit.maxSorts) {
      throw new ForbiddenException(`Too many sort fields. Maximum allowed: ${this.rateLimit.maxSorts}`);
    }

    for (const sort of sorts) {
      if (!sort.field) {
        throw new ForbiddenException('Sort field is required');
      }

      if (!this.allowList.fields.includes(sort.field)) {
        throw new ForbiddenException(`Sort field '${sort.field}' is not allowed`);
      }

      if (this.sensitiveFields.has(sort.field)) {
        throw new ForbiddenException(`Field '${sort.field}' contains sensitive data and cannot be sorted`);
      }
    }
  }

  private validateAggregates(aggregate: any): void {
    if (aggregate.sum) {
      for (const field of aggregate.sum) {
        if (!this.allowList.fields.includes(field)) {
          throw new ForbiddenException(`Aggregate field '${field}' is not allowed`);
        }
        if (this.sensitiveFields.has(field)) {
          throw new ForbiddenException(`Field '${field}' contains sensitive data and cannot be aggregated`);
        }
      }
    }

    if (aggregate.avg) {
      for (const field of aggregate.avg) {
        if (!this.allowList.fields.includes(field)) {
          throw new ForbiddenException(`Aggregate field '${field}' is not allowed`);
        }
        if (this.sensitiveFields.has(field)) {
          throw new ForbiddenException(`Field '${field}' contains sensitive data and cannot be aggregated`);
        }
      }
    }
  }

  private checkRateLimits(params: AdvancedQueryParams): void {
    // Check page limit
    if (params.page?.limit && params.page.limit > this.rateLimit.maxLimit) {
      throw new ForbiddenException(`Page limit too high. Maximum allowed: ${this.rateLimit.maxLimit}`);
    }

    // Calculate and check complexity
    const complexity = this.calculateComplexity(params);
    if (complexity > this.rateLimit.maxComplexity) {
      throw new ForbiddenException(`Query too complex. Complexity: ${complexity}, Maximum allowed: ${this.rateLimit.maxComplexity}`);
    }
  }

  private async validateUserPermissions(
    params: AdvancedQueryParams,
    userId?: string,
    tenantId?: string
  ): Promise<void> {
    // Check if user has permission to access this source
    // This is a placeholder - implement based on your permission system

    // Example: Check if user can access draft posts
    if (params.where?.status === 'draft' && !userId) {
      throw new ForbiddenException('Authentication required to access draft content');
    }

    // Example: Tenant isolation
    if (tenantId && params.source === 'tenant_specific_data') {
      // Ensure tenant isolation is enforced
      // This would be handled in the query builder
    }
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

  private calculateComplexity(params: AdvancedQueryParams): number {
    let complexity = 10; // Base complexity

    // Add complexity for expands
    if (params.expand) {
      complexity += params.expand.length * 20;
      params.expand.forEach(exp => {
        if (exp.includes('.')) {
          complexity += exp.split('.').length * 10;
        }
      });
    }

    // Add complexity for where conditions
    if (params.where) {
      complexity += this.countConditions(params.where) * 5;
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

    return complexity;
  }

  sanitizeOutput(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeOutput(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};

      for (const [key, value] of Object.entries(data)) {
        if (this.sensitiveFields.has(key)) {
          // Remove sensitive field
          continue;
        }

        if (typeof value === 'object') {
          sanitized[key] = this.sanitizeOutput(value);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    }

    return data;
  }
}
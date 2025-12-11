/**
 * Tenant-Aware Repository
 * Phase 8 — Multi-Tenant Data Isolation Enhancement
 *
 * Provides a repository wrapper that automatically applies tenant filtering
 * to all queries on tenant-scoped entities.
 */

import {
  Repository,
  SelectQueryBuilder,
  FindManyOptions,
  FindOneOptions,
  DeepPartial,
  ObjectLiteral,
  EntityTarget,
  DataSource,
} from 'typeorm';
import logger from '../utils/logger.js';
import {
  isTenantScoped,
  getTenantColumn,
  getTenantScopedOptions,
} from '../decorators/tenant-scoped.decorator.js';

/**
 * Error thrown when tenant context is missing
 */
export class TenantContextMissingError extends Error {
  constructor(entityName: string) {
    super(`Tenant context is required for entity: ${entityName}`);
    this.name = 'TenantContextMissingError';
  }
}

/**
 * Error thrown when cross-tenant access is attempted
 */
export class CrossTenantAccessError extends Error {
  constructor(expectedTenant: string, actualTenant: string) {
    super(`Cross-tenant access denied. Expected: ${expectedTenant}, Actual: ${actualTenant}`);
    this.name = 'CrossTenantAccessError';
  }
}

/**
 * Tenant context interface
 */
export interface TenantContext {
  tenantId: string;
  isGlobalAccess?: boolean;
}

/**
 * Tenant-Aware Repository Class
 *
 * Wraps a TypeORM repository to automatically apply tenant filtering.
 */
export class TenantAwareRepository<Entity extends ObjectLiteral> {
  private readonly repository: Repository<Entity>;
  private readonly entityName: string;
  private readonly isTenantScoped: boolean;
  private readonly tenantColumn: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly target: EntityTarget<Entity>,
    private readonly tenantContext: TenantContext
  ) {
    this.repository = dataSource.getRepository(target);
    this.entityName = this.repository.metadata.name;
    this.isTenantScoped = isTenantScoped(target as Function);
    this.tenantColumn = getTenantColumn(target as Function);
  }

  /**
   * Validate tenant context
   */
  private validateTenantContext(): void {
    if (!this.isTenantScoped) {
      return; // Non-tenant-scoped entities don't need validation
    }

    const options = getTenantScopedOptions(this.target as Function);

    if (this.tenantContext.isGlobalAccess && options?.allowGlobalAccess) {
      return; // Global access is allowed
    }

    if (!this.tenantContext.tenantId && options?.required) {
      throw new TenantContextMissingError(this.entityName);
    }
  }

  /**
   * Apply tenant filter to query builder
   */
  private applyTenantFilter(
    qb: SelectQueryBuilder<Entity>,
    alias: string
  ): SelectQueryBuilder<Entity> {
    if (!this.isTenantScoped) {
      return qb;
    }

    const options = getTenantScopedOptions(this.target as Function);

    if (this.tenantContext.isGlobalAccess && options?.allowGlobalAccess) {
      return qb; // Skip tenant filter for global access
    }

    if (this.tenantContext.tenantId) {
      qb.andWhere(`${alias}.${this.tenantColumn} = :tenantId`, {
        tenantId: this.tenantContext.tenantId,
      });
    }

    return qb;
  }

  /**
   * Apply tenant filter to find options
   */
  private applyTenantFilterToOptions<T extends FindManyOptions<Entity> | FindOneOptions<Entity>>(
    options: T = {} as T
  ): T {
    if (!this.isTenantScoped) {
      return options;
    }

    const scopedOptions = getTenantScopedOptions(this.target as Function);

    if (this.tenantContext.isGlobalAccess && scopedOptions?.allowGlobalAccess) {
      return options;
    }

    if (this.tenantContext.tenantId) {
      const where = options.where || {};
      const tenantWhere = { [this.tenantColumn]: this.tenantContext.tenantId };

      if (Array.isArray(where)) {
        options.where = where.map(w => ({ ...w, ...tenantWhere }));
      } else {
        options.where = { ...where, ...tenantWhere } as any;
      }
    }

    return options;
  }

  /**
   * Ensure entity has correct tenant ID
   */
  private ensureTenantId(entity: DeepPartial<Entity>): DeepPartial<Entity> {
    if (!this.isTenantScoped) {
      return entity;
    }

    const options = getTenantScopedOptions(this.target as Function);

    if (this.tenantContext.isGlobalAccess && options?.allowGlobalAccess) {
      return entity;
    }

    if (this.tenantContext.tenantId) {
      (entity as any)[this.tenantColumn] = this.tenantContext.tenantId;
    }

    return entity;
  }

  /**
   * Create a query builder with tenant filtering
   */
  createQueryBuilder(alias: string): SelectQueryBuilder<Entity> {
    this.validateTenantContext();
    const qb = this.repository.createQueryBuilder(alias);
    return this.applyTenantFilter(qb, alias);
  }

  /**
   * Find all entities
   */
  async find(options?: FindManyOptions<Entity>): Promise<Entity[]> {
    this.validateTenantContext();
    const filteredOptions = this.applyTenantFilterToOptions(options);
    return this.repository.find(filteredOptions);
  }

  /**
   * Find one entity
   */
  async findOne(options: FindOneOptions<Entity>): Promise<Entity | null> {
    this.validateTenantContext();
    const filteredOptions = this.applyTenantFilterToOptions(options);
    return this.repository.findOne(filteredOptions);
  }

  /**
   * Find one entity by ID
   */
  async findOneById(id: string | number): Promise<Entity | null> {
    this.validateTenantContext();
    const where: any = { id };

    if (this.isTenantScoped && this.tenantContext.tenantId) {
      where[this.tenantColumn] = this.tenantContext.tenantId;
    }

    return this.repository.findOne({ where });
  }

  /**
   * Find entities and count
   */
  async findAndCount(options?: FindManyOptions<Entity>): Promise<[Entity[], number]> {
    this.validateTenantContext();
    const filteredOptions = this.applyTenantFilterToOptions(options);
    return this.repository.findAndCount(filteredOptions);
  }

  /**
   * Count entities
   */
  async count(options?: FindManyOptions<Entity>): Promise<number> {
    this.validateTenantContext();
    const filteredOptions = this.applyTenantFilterToOptions(options);
    return this.repository.count(filteredOptions);
  }

  /**
   * Save entity (create or update)
   */
  async save(entity: DeepPartial<Entity>): Promise<Entity> {
    this.validateTenantContext();
    const entityWithTenant = this.ensureTenantId(entity);

    // For updates, verify the entity belongs to this tenant
    if ((entity as any).id && this.isTenantScoped) {
      const existing = await this.findOneById((entity as any).id);
      if (existing && (existing as any)[this.tenantColumn] !== this.tenantContext.tenantId) {
        throw new CrossTenantAccessError(
          this.tenantContext.tenantId,
          (existing as any)[this.tenantColumn]
        );
      }
    }

    return this.repository.save(entityWithTenant as any);
  }

  /**
   * Save multiple entities
   */
  async saveMany(entities: DeepPartial<Entity>[]): Promise<Entity[]> {
    this.validateTenantContext();
    const entitiesWithTenant = entities.map(e => this.ensureTenantId(e));
    return this.repository.save(entitiesWithTenant as any[]);
  }

  /**
   * Create entity (without saving)
   */
  create(entity: DeepPartial<Entity>): Entity {
    const entityWithTenant = this.ensureTenantId(entity);
    return this.repository.create(entityWithTenant as DeepPartial<Entity>) as Entity;
  }

  /**
   * Remove entity
   */
  async remove(entity: Entity): Promise<Entity> {
    this.validateTenantContext();

    // Verify the entity belongs to this tenant
    if (this.isTenantScoped && (entity as any)[this.tenantColumn] !== this.tenantContext.tenantId) {
      throw new CrossTenantAccessError(
        this.tenantContext.tenantId,
        (entity as any)[this.tenantColumn]
      );
    }

    return this.repository.remove(entity);
  }

  /**
   * Soft remove entity (set deletedAt)
   */
  async softRemove(entity: Entity): Promise<Entity> {
    this.validateTenantContext();

    // Verify the entity belongs to this tenant
    if (this.isTenantScoped && (entity as any)[this.tenantColumn] !== this.tenantContext.tenantId) {
      throw new CrossTenantAccessError(
        this.tenantContext.tenantId,
        (entity as any)[this.tenantColumn]
      );
    }

    return this.repository.softRemove(entity);
  }

  /**
   * Delete by criteria
   */
  async delete(criteria: any): Promise<any> {
    this.validateTenantContext();

    // Add tenant filter to criteria
    if (this.isTenantScoped && this.tenantContext.tenantId) {
      criteria[this.tenantColumn] = this.tenantContext.tenantId;
    }

    return this.repository.delete(criteria);
  }

  /**
   * Get the underlying repository (use with caution)
   */
  getRepository(): Repository<Entity> {
    return this.repository;
  }
}

/**
 * Factory function to create tenant-aware repository
 */
export function createTenantAwareRepository<Entity extends ObjectLiteral>(
  dataSource: DataSource,
  target: EntityTarget<Entity>,
  tenantContext: TenantContext
): TenantAwareRepository<Entity> {
  return new TenantAwareRepository(dataSource, target, tenantContext);
}

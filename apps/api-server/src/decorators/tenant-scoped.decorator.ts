/**
 * Tenant Scoped Decorator
 * Phase 8 — Multi-Tenant Data Isolation Enhancement
 *
 * Marks entities as tenant-scoped, requiring tenantId for all operations.
 * Integrates with QueryBuilder to automatically filter by tenant.
 */

import 'reflect-metadata';

/**
 * Metadata key for tenant-scoped entities
 */
export const TENANT_SCOPED_KEY = Symbol('tenant:scoped');

/**
 * Metadata key for tenant ID column name
 */
export const TENANT_ID_COLUMN_KEY = Symbol('tenant:column');

/**
 * Tenant scoped options
 */
export interface TenantScopedOptions {
  /** Column name for tenant ID (default: 'tenantId') */
  column?: string;

  /** Whether to throw error if tenant is missing (default: true) */
  required?: boolean;

  /** Allow global access (bypass tenant filter) for admin operations */
  allowGlobalAccess?: boolean;
}

/**
 * @TenantScoped() decorator
 *
 * Marks an entity as tenant-scoped. All queries on this entity
 * will automatically be filtered by tenantId.
 *
 * @example
 * ```typescript
 * @Entity()
 * @TenantScoped()
 * class Product {
 *   @Column()
 *   tenantId: string;
 *
 *   @Column()
 *   name: string;
 * }
 * ```
 */
export function TenantScoped(options: TenantScopedOptions = {}): ClassDecorator {
  return (target: Function) => {
    const defaultOptions: TenantScopedOptions = {
      column: 'tenantId',
      required: true,
      allowGlobalAccess: false,
      ...options,
    };

    Reflect.defineMetadata(TENANT_SCOPED_KEY, true, target);
    Reflect.defineMetadata(TENANT_ID_COLUMN_KEY, defaultOptions, target);
  };
}

/**
 * Check if an entity class is tenant-scoped
 */
export function isTenantScoped(target: Function): boolean {
  return Reflect.getMetadata(TENANT_SCOPED_KEY, target) === true;
}

/**
 * Get tenant scoped options for an entity
 */
export function getTenantScopedOptions(target: Function): TenantScopedOptions | undefined {
  if (!isTenantScoped(target)) {
    return undefined;
  }
  return Reflect.getMetadata(TENANT_ID_COLUMN_KEY, target);
}

/**
 * Get tenant column name for an entity
 */
export function getTenantColumn(target: Function): string {
  const options = getTenantScopedOptions(target);
  return options?.column || 'tenantId';
}

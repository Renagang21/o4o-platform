/**
 * TypeORM Adapter for CPT Registry
 * Optional: Auto-sync schemas to database on registration
 */

import type { CPTSchema } from '../schema.js';

/**
 * TypeORM sync hook interface
 * Implement this to sync CPT schemas to database tables
 */
export interface TypeORMAdapter {
  /**
   * Called after a CPT schema is registered
   * Use this to create/update database tables, columns, etc.
   */
  onRegister(schema: CPTSchema): Promise<void>;

  /**
   * Called after a CPT schema is unregistered
   * Use this to mark tables as deprecated (do NOT drop tables)
   */
  onUnregister(name: string): Promise<void>;
}

/**
 * Example implementation (to be customized per project)
 */
export class ExampleTypeORMAdapter implements TypeORMAdapter {
  async onRegister(schema: CPTSchema): Promise<void> {
    // Example: Log registration event
    console.log(`[TypeORM] CPT registered: ${schema.name}`);

    // In a real implementation, you might:
    // 1. Create a row in cpt_definitions table
    // 2. Update field metadata in a separate table
    // 3. Trigger migrations if schema changed
    // 4. Invalidate caches
  }

  async onUnregister(name: string): Promise<void> {
    console.log(`[TypeORM] CPT unregistered: ${name}`);

    // In a real implementation, you might:
    // 1. Mark cpt_definition as inactive (do NOT delete)
    // 2. Archive field metadata
    // 3. Invalidate caches
  }
}

/**
 * Registry adapter connector
 * Call this in your bootstrap to enable DB sync
 */
export function connectAdapter(
  registry: any,
  adapter: TypeORMAdapter
): void {
  // Hook into registry lifecycle
  const originalRegister = registry.register.bind(registry);
  const originalUnregister = registry.unregister.bind(registry);

  registry.register = (schema: CPTSchema) => {
    originalRegister(schema);
    adapter.onRegister(schema).catch(err => {
      console.error(`[TypeORM Adapter] Failed to sync schema "${schema.name}":`, err);
    });
  };

  registry.unregister = (name: string) => {
    const result = originalUnregister(name);
    if (result) {
      adapter.onUnregister(name).catch(err => {
        console.error(`[TypeORM Adapter] Failed to unsync schema "${name}":`, err);
      });
    }
    return result;
  };
}

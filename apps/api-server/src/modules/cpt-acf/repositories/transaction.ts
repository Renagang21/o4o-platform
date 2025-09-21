import type { DataSource, EntityManager } from 'typeorm';

export async function withTransaction<T>(ds: DataSource, fn: (m: EntityManager) => Promise<T>): Promise<T> {
  return ds.transaction(fn);
}


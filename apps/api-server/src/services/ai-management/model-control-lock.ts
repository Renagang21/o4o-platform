import type { DataSource, EntityManager } from "typeorm";

/** Policy model references and catalog retirement must use the same transaction lock. */
export async function withAiModelControlLock<T>(
  db: Pick<DataSource, "transaction">,
  run: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  return db.transaction(async (manager) => {
    await manager.query("SELECT pg_advisory_xact_lock($1, $2)", [179187, 4349]);
    return run(manager);
  });
}

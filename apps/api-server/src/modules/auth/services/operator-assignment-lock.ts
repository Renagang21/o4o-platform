import type { EntityManager } from "typeorm";

/** Concurrency classification only; this grants no role or permission. */
export function isOperatorAssignmentRole(role: string): boolean {
  return /(?:^|:|_)operator$/.test(role);
}
/** Shared by canonical role writes and service-admin preflight; requires the mutation transaction. */
export async function lockOperatorAssignments(
  manager: Pick<EntityManager, "query">,
  userId: string,
): Promise<void> {
  await manager.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    `operator-assignment:${userId}`,
  ]);
}

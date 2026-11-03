import type { EntityManager } from "typeorm";
/** Internal, currently authorized business disposition, never an HTTP-supplied override.
 * The caller holds the erasure barrier. Ordinary writers stay fenced throughout.
 * Processing is transaction-local and the previous incomplete state is restored;
 * only the account orchestrator may complete an erasure after a fresh residual scan.
 */
export async function withBusinessErasureDisposition<T>(
  m: Pick<EntityManager, "query">,
  subjectId: string,
  work: () => Promise<T>,
): Promise<T> {
  const [operation] = await m.query(
    `SELECT id,state FROM account_erasure_operations WHERE subject_id=$1
   AND state IN ('pending','review_required','retry_required') FOR UPDATE`,
    [subjectId],
  );
  if (!operation) return work();
  const [prior] = await m.query(
    "SELECT current_setting('o4o.erasure_operation',true) AS value",
  );
  await m.query(
    "UPDATE account_erasure_operations SET state='processing',updated_at=now() WHERE id=$1",
    [operation.id],
  );
  await m.query("SELECT set_config('o4o.erasure_operation',$1,true)", [
    operation.id,
  ]);
  const value = await work(); // A failure rolls back the enclosing transaction, including this claim.
  await m.query(
    "UPDATE account_erasure_operations SET state=$2,updated_at=now() WHERE id=$1",
    [operation.id, operation.state],
  );
  await m.query("SELECT set_config('o4o.erasure_operation',$1,true)", [
    prior?.value ?? "",
  ]);
  return value;
}

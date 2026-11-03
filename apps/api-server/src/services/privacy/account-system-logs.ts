import type { EntityManager } from "typeorm";
import type { ErasureTable } from "./account-business-data.js";
// Existing policy §§4–6, 8, 13. Preserve original clocks; these are minimum,
// purpose-separated delivery/security records, not a retained account/profile.
export const SUBJECT_EMAILS_SQL = `(SELECT lower(email) FROM users WHERE id::text=$1 UNION SELECT lower(email) FROM linked_accounts WHERE "userId"::text=$1 AND email IS NOT NULL)`;
export const EMAIL_LOG_OWNER_SQL = `lower(r.recipient) IN ${SUBJECT_EMAILS_SQL}`;
export const PROFILE_AUDIT_SQL = `r."entityType" IN ('User','user','users') AND r."entityId"::text=$1`;
const SUBJECT_OPERATION = `r.action_key ~ '^(member[.]|qualification[.]pharmacist_|pharmacy_membership[.])' AND (r.meta->>'targetUserId'=$1 OR r.meta->>'applicantId'=$1)`;
const APPLICATION_OPERATION = `r.action_key='service:application_policy' AND r.user_id::text=$1 AND jsonb_typeof(r.meta->'application')='object' AND jsonb_typeof(r.meta->'policies')='array'`;
export function systemLogProjection(
  table: ErasureTable,
  row: string,
  alias = "r",
): string {
  if (table.schema_name !== "public") return row;
  const sql = (value: string) => value.replaceAll("r.", alias + ".");
  if (table.table_name === "login_attempts")
    return `(CASE WHEN lower(${alias}.email) IN ${SUBJECT_EMAILS_SQL} THEN ${row}-ARRAY['email','userAgent','failureReason'] ELSE ${row} END)`;
  if (table.table_name === "email_logs")
    return `(CASE WHEN ${sql(EMAIL_LOG_OWNER_SQL)} THEN ${row}-ARRAY['recipient','sender','subject','body','htmlBody','response','error','attachments','metadata'] ELSE ${row} END)`;
  if (table.table_name === "audit_logs")
    return `(CASE WHEN ${sql(PROFILE_AUDIT_SQL)} THEN ${row}-ARRAY['entityId','userId','changes','reason','userAgent'] WHEN ${alias}."userId"::text=$1 THEN ${row}-ARRAY['userId','userAgent'] ELSE ${row} END)`;
  if (table.table_name === "ai_usage_logs")
    return `(CASE WHEN ${alias}."userId"::text=$1 THEN ${row}-ARRAY['userId','errorMessage'] ELSE ${row} END)`;
  if (table.table_name === "action_logs")
    return `(CASE WHEN ${sql(SUBJECT_OPERATION)} THEN (${row}-ARRAY['meta'])||jsonb_build_object('meta',${alias}.meta-ARRAY['targetUserId','applicantId','reason','licenseNumber','before','after']) WHEN ${sql(APPLICATION_OPERATION)} THEN (${row}-ARRAY['user_id','meta'])||jsonb_build_object('meta',jsonb_set(${alias}.meta,'{application}',(${alias}.meta->'application')-'id')) ELSE ${row} END)`;
  return row;
}
/** File copies in these fields disappear with the private profile; shared proofs do not. */
export function privateLogPointerPredicate(table: string): string | undefined {
  if (table === "email_logs") return EMAIL_LOG_OWNER_SQL;
  if (table === "audit_logs") return PROFILE_AUDIT_SQL;
  if (table === "ai_usage_logs") return 'r."userId"::text=$1';
  return undefined;
}
export async function systemLogReviews(
  db: Pick<EntityManager, "query">,
  userId: string,
) {
  for (const [table, predicate, anchor] of [
    [
      "login_attempts",
      `lower(r.email) IN ${SUBJECT_EMAILS_SQL}`,
      'r."createdAt"',
    ],
    ["email_logs", EMAIL_LOG_OWNER_SQL, 'COALESCE(r."sentAt",r."createdAt")'],
    [
      "audit_logs",
      `(${PROFILE_AUDIT_SQL}) OR r."userId"::text=$1`,
      'r."createdAt"',
    ],
    [
      "action_logs",
      `(${SUBJECT_OPERATION}) OR (${APPLICATION_OPERATION})`,
      "r.created_at",
    ],
    ["ai_usage_logs", 'r."userId"::text=$1', 'r."createdAt"'],
  ]) {
    const rows = await db.query(
      `SELECT 1 FROM public.${table} r WHERE (${predicate}) AND (${anchor} IS NULL OR NOT isfinite(${anchor}) OR ${anchor}>statement_timestamp()) LIMIT 1`,
      [userId],
    );
    if (rows.length) return ["SYSTEM_LOG_RETENTION_ANCHOR_REVIEW_REQUIRED"];
  }
  return [];
}
export async function minimizeSystemLogs(
  db: Pick<EntityManager, "query">,
  userId: string,
  key: string,
) {
  await db.query(
    `UPDATE login_attempts r SET email='erased:'||$2,"userAgent"=NULL,"failureReason"=NULL WHERE lower(r.email) IN ${SUBJECT_EMAILS_SQL}`,
    [userId, key],
  );
  await db.query(
    `UPDATE email_logs r SET recipient='erased:'||$2,sender=CASE WHEN lower(sender) IN ${SUBJECT_EMAILS_SQL} THEN NULL ELSE sender END,
 subject='발송 기록',body=NULL,"htmlBody"=NULL,response=NULL,error=NULL,attachments=NULL,"userId"=NULL,metadata=json_build_object('recipientKey',$2::text)
 WHERE ${EMAIL_LOG_OWNER_SQL}`,
    [userId, key],
  );
  await db.query(
    `UPDATE audit_logs r SET changes=NULL,reason=NULL,"userAgent"=NULL WHERE ${PROFILE_AUDIT_SQL}`,
    [userId],
  );
  await db.query(
    `UPDATE audit_logs r SET "userAgent"=NULL WHERE "userId"::text=$1`,
    [userId],
  );
  await db.query(
    `UPDATE ai_usage_logs SET "errorMessage"=NULL WHERE "userId"::text=$1`,
    [userId],
  );
  await db.query(
    `UPDATE action_logs r SET meta=(meta-ARRAY['targetUserId','applicantId','reason','licenseNumber','before','after'])||jsonb_build_object('subjectKey',$2::text) WHERE ${SUBJECT_OPERATION}`,
    [userId, key],
  );
  await db.query(
    `UPDATE action_logs r SET user_id=NULL,meta=jsonb_set(meta,'{application}',(meta->'application')-'id')||jsonb_build_object('actorKey',$2::text) WHERE ${APPLICATION_OPERATION}`,
    [userId, key],
  );
}

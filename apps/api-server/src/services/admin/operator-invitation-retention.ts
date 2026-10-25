import type { EntityManager } from "typeorm";
import { CALENDAR_EXPIRY_SQL } from "../privacy/calendar-retention.js";

/** TypeORM PostgreSQL UPDATE/DELETE raw results are [rows, rowCount]; SELECT/INSERT are rows. */
export function invitationReturningRows<T>(value: unknown): T[] {
  if (
    Array.isArray(value) &&
    Array.isArray(value[0]) &&
    typeof value[1] === "number"
  )
    return value[0] as T[];
  return value as T[];
}
/** Trusted constants; never log row/email/token data. Expiry uses PG precision and Seoul calendar years. */
export async function retainOperatorInvitations(
  m: Pick<EntityManager, "query">,
  now: Date,
  batch = 500,
) {
  const expired: Array<{ id: string }> = await m.query(
    `WITH due AS (
    SELECT id FROM service_operator_invitations WHERE status='pending' AND expires_at<=$1
    ORDER BY expires_at,id FOR UPDATE SKIP LOCKED LIMIT $2
  ) UPDATE service_operator_invitations i SET status='expired',invited_email=NULL,token_hash=NULL,updated_at=$1
    FROM due WHERE i.id=due.id RETURNING i.id`,
    [now, batch],
  );
  const purged: Array<{ id: string }> = await m.query(
    `WITH due AS (
    SELECT i.id FROM service_operator_invitations i
    CROSS JOIN LATERAL (SELECT i.created_at AS source_at,1 AS years) clock
    WHERE i.status<>'pending' AND ${CALENDAR_EXPIRY_SQL}<=$1
    ORDER BY i.created_at,i.id FOR UPDATE OF i SKIP LOCKED LIMIT $2
  ) DELETE FROM service_operator_invitations i USING due WHERE i.id=due.id RETURNING i.id`,
    [now, batch],
  );
  return {
    expired: invitationReturningRows<{ id: string }>(expired).length,
    purged: invitationReturningRows<{ id: string }>(purged).length,
  };
}

/** Minimal immediate revocation audit; no email, token, arbitrary reason or profile is retained. */
export async function recordOperatorRevocation(
  m: Pick<EntityManager, "query">,
  actor: string,
  target: string,
  service: string,
  role: string,
  scopeType = "platform",
  scopeKey = "",
) {
  await m.query(
    `INSERT INTO service_operator_invitations
    (service_key,role,target_user_id,invited_by_user_id,purpose,status,scope_type,scope_key,expires_at)
    VALUES($1,$2,$3,$4,'revocation','revoked',$5,$6,now())`,
    [service, role, target, actor, scopeType, scopeKey],
  );
}

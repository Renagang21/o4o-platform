import type { EntityManager } from 'typeorm';

/** Only the two typed central-menu events are classified here. Unknown logs remain reviews. */
export const CENTRAL_MENU_AUDIT_SQL = `r.source='manual' AND r.status='success'
  AND (r.action_key='operator.central_menu_grants_changed'
    OR (r.action_key='admin.service_operator_assigned' AND r.meta->>'scope'='o4o-direct'))
  AND jsonb_typeof(r.meta)='object'
  AND r.meta - ARRAY['scope','targetUserId','role','menuKeys','reason','actorKey','subjectKey'] = '{}'::jsonb
  AND (NOT (r.meta ? 'scope') OR r.meta->>'scope'='o4o-direct')
  AND (NOT (r.meta ? 'reason') OR jsonb_typeof(r.meta->'reason')='string')
  AND (NOT (r.meta ? 'actorKey') OR (jsonb_typeof(r.meta->'actorKey')='string' AND r.meta->>'actorKey' ~ '^[0-9a-f]{64}$'))
  AND (NOT (r.meta ? 'subjectKey') OR (jsonb_typeof(r.meta->'subjectKey')='string' AND r.meta->>'subjectKey' ~ '^[0-9a-f]{64}$'))
  AND (NOT (r.meta ? 'targetUserId') OR r.meta->>'targetUserId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  AND (r.meta->>'targetUserId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR r.meta->>'subjectKey' ~ '^[0-9a-f]{64}$')
  AND r.meta->>'role' ~ '^(neture|supplier|funding|lecture|community|partner-support):(admin|operator)$|^neture:pharmcoop_(admin|operator)$'
  AND jsonb_typeof(r.meta->'menuKeys')='array'
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(r.meta->'menuKeys')='array' THEN r.meta->'menuKeys' ELSE '[]'::jsonb END) key
    WHERE jsonb_typeof(key)<>'string' OR key #>> '{}' !~ '^[a-z-]+[.][a-z-]+$'
      OR split_part(key #>> '{}','.',1) <> CASE
        WHEN r.meta->>'role' LIKE 'neture:pharmcoop_%' THEN 'pharmcoop'
        ELSE split_part(r.meta->>'role',':',1) END)`;

export const CENTRAL_MENU_AUDIT_SUBJECT_SQL = `(${CENTRAL_MENU_AUDIT_SQL})
  AND (r.user_id::text=$1 OR r.meta->>'targetUserId'=$1)`;

/** Keep action/time/service and pseudonymous attribution under the existing log retention.
 * No expiry reset, log deletion, or blanket exemption for other audit records.
 */
export async function minimizeCentralMenuAudit(
  m: Pick<EntityManager, 'query'>, userId: string, subjectKey: string,
) {
  await m.query(`UPDATE action_logs r SET
    meta=(r.meta-'reason'-'targetUserId')
      || CASE WHEN r.meta->>'targetUserId'=$1 THEN jsonb_build_object('subjectKey',$2::text)
        WHEN r.meta ? 'targetUserId' THEN jsonb_build_object('targetUserId',r.meta->'targetUserId')
        ELSE '{}'::jsonb END
      || CASE WHEN r.user_id::text=$1 THEN jsonb_build_object('actorKey',$2::text) ELSE '{}'::jsonb END,
    user_id=CASE WHEN r.user_id::text=$1 THEN NULL ELSE r.user_id END
    WHERE ${CENTRAL_MENU_AUDIT_SUBJECT_SQL}`, [userId,subjectKey]);
}

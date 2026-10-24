import type { DataSource, EntityManager } from "typeorm";
import {
  assertInboxWriter,
  resolveInboxScope,
} from "../../contact-inquiry/inbox-scope.js";
import {
  OperationError,
  recordOperation,
} from "../../../services/operations/operation-audit.js";

/**
 * Lecture certificate operation history. One action_logs namespace (`lecture.certificate_*`) through the shared
 * recordOperation; reasons and actors stay in action_logs and never enter the public certificate DTO or metadata.
 * WO-O4O-LECTURE-CERTIFICATE-OPERATION-HISTORY-UNIFICATION-V1
 */
export const CERTIFICATE_OPERATION_ACTIONS = {
  issue: "lecture.certificate_issue",
  renew: "lecture.certificate_renew",
  update: "lecture.certificate_update",
  revoke: "lecture.certificate_revoke",
} as const;
type ChangeAction = "renew" | "update" | "revoke";
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHANGE_FIELDS = [
  "certificateUrl",
  "badgeUrl",
  "isValid",
  "expiresAt",
  "metadata",
] as const;

export function certificateState(row: {
  isValid: boolean;
  expiresAt?: Date | string | null;
}) {
  return {
    isValid: row.isValid,
    expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
  };
}

function operationId(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !UUID.test(value))
    throw new OperationError(
      400,
      "INVALID_OPERATION_ID",
      "처리 요청 ID를 확인해 주세요.",
    );
  return value;
}

function revokeReason(reason: unknown) {
  if (
    typeof reason !== "string" ||
    [...reason.trim()].length > 2000 ||
    reason.includes("\0")
  )
    throw new OperationError(
      400,
      "INVALID_REASON",
      "폐기 사유는 2,000자 이내로 입력해 주세요.",
    );
  return reason.trim();
}

function renewMonths(value: unknown) {
  const months = value === undefined || value === null ? 12 : value;
  if (!Number.isSafeInteger(months) || (months as number) < 1 || (months as number) > 1200)
    throw new OperationError(
      400,
      "INVALID_MONTHS",
      "갱신 기간은 1~1,200개월 정수로 입력해 주세요.",
    );
  return months as number;
}

function updatePatch(input: unknown) {
  const source = (input ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const key of CHANGE_FIELDS)
    if (Object.prototype.hasOwnProperty.call(source, key))
      patch[key] = source[key];
  if (patch.isValid !== undefined && typeof patch.isValid !== "boolean")
    throw new OperationError(400, "INVALID_FIELD", "유효 상태를 확인해 주세요.");
  if (patch.expiresAt !== undefined && patch.expiresAt !== null) {
    const date = new Date(patch.expiresAt as string);
    if (!Number.isFinite(date.getTime()))
      throw new OperationError(400, "INVALID_FIELD", "만료일을 확인해 주세요.");
    patch.expiresAt = date;
  }
  for (const key of ["certificateUrl", "badgeUrl"] as const)
    if (patch[key] !== undefined && patch[key] !== null && typeof patch[key] !== "string")
      throw new OperationError(400, "INVALID_FIELD", "주소 값을 확인해 주세요.");
  if (patch.metadata !== undefined && patch.metadata !== null && (typeof patch.metadata !== "object" || Array.isArray(patch.metadata)))
    throw new OperationError(400, "INVALID_FIELD", "부가 정보를 확인해 주세요.");
  return patch;
}

/** Issue linkage: called inside the issuing transaction after the certificate row is saved. */
export async function recordCertificateIssue(
  manager: Pick<EntityManager, "query">,
  certificate: { id: string; courseId: string; userId: string; isValid: boolean; expiresAt?: Date | string | null },
  actor: string | undefined,
) {
  await recordOperation(manager, "lecture", actor ?? null, CERTIFICATE_OPERATION_ACTIONS.issue, {
    certificateId: certificate.id,
    courseId: certificate.courseId,
    subjectId: certificate.userId,
    trigger: actor ? "operator" : "completion",
    before: null,
    after: certificateState(certificate),
  });
}

/**
 * The completion chain issues the certificate (and sets lms_enrollments.certificateId) while the caller still holds
 * the enrollment entity it loaded earlier. TypeORM's save() diffs that entity against the row and would write the
 * stale null back. Call after the chain and before saving the caller's entity again.
 */
export async function keepCertificateLink(
  db: Pick<DataSource, "query">,
  enrollment: { id: string; certificateId?: string | null },
) {
  const [row] = await db.query(
    'SELECT "certificateId" FROM lms_enrollments WHERE id=$1',
    [enrollment.id],
  );
  if (row?.certificateId) enrollment.certificateId = row.certificateId;
}

/**
 * Renew / update / revoke under one row lock with the shared inbox writer check.
 * A repeated operationId returns the current row without a second history entry.
 * Revoking an already revoked certificate is a no-op (no history), as before.
 */
export async function changeLectureCertificate(
  db: DataSource,
  id: string,
  actor: string | undefined,
  action: ChangeAction,
  input: { reason?: unknown; months?: unknown; patch?: unknown; operationId?: unknown } = {},
) {
  if (!actor)
    throw new OperationError(
      403,
      "ACTOR_REQUIRED",
      "운영자 인증을 확인해 주세요.",
    );
  const key = operationId(input.operationId);
  const reason = action === "revoke" ? revokeReason(input.reason ?? "") : null;
  const months = action === "renew" ? renewMonths(input.months) : null;
  const patch = action === "update" ? updatePatch(input.patch) : null;
  return db.transaction(async (manager) => {
    await assertInboxWriter(
      manager,
      await resolveInboxScope(manager, "service", "lecture"),
      actor,
    );
    const [certificate] = await manager.query(
      `SELECT cert.* FROM lms_certificates cert JOIN lms_courses c ON c.id=cert."courseId"
       WHERE cert.id=$1 AND c.service_key='lecture' FOR UPDATE OF cert FOR SHARE OF c`,
      [id],
    );
    if (!certificate)
      throw new OperationError(404, "NOT_FOUND", "수료증을 찾을 수 없습니다.");
    if (key) {
      const [prior] = await manager.query(
        `SELECT 1 FROM action_logs WHERE service_key='lecture' AND action_key=$1
         AND meta->>'certificateId'=$2 AND meta->>'operationId'=$3 LIMIT 1`,
        [CERTIFICATE_OPERATION_ACTIONS[action], id, key],
      );
      if (prior) return certificate;
    }
    if (action === "revoke" && !certificate.isValid) return certificate;
    const before = certificateState(certificate);
    // TypeORM's postgres driver returns [rows, affectedCount] for UPDATE ... RETURNING.
    const updateRow = async (sql: string, params: unknown[]) => {
      const [rows] = await manager.query(sql, params);
      return rows[0];
    };
    let after: Record<string, unknown>;
    if (action === "revoke") {
      after = await updateRow(
        'UPDATE lms_certificates SET "isValid"=false WHERE id=$1 RETURNING *',
        [id],
      );
    } else if (action === "renew") {
      // Same rule as Certificate.renew(): expiresAt = now + months, isValid = true (also re-validates a revoked row).
      after = await updateRow(
        `UPDATE lms_certificates SET "isValid"=true, "expiresAt"=now() + make_interval(months => $2)
         WHERE id=$1 RETURNING *`,
        [id, months],
      );
    } else {
      // Column names come only from the fixed CHANGE_FIELDS allowlist; values are bound parameters.
      const fields = Object.keys(patch!);
      if (!fields.length) return certificate;
      const columns = fields.map((field, i) => `"${field}"=$${i + 2}`).join(",");
      after = await updateRow(
        `UPDATE lms_certificates SET ${columns} WHERE id=$1 RETURNING *`,
        [id, ...fields.map((f) => (f === "metadata" && patch![f] !== null ? JSON.stringify(patch![f]) : patch![f]))],
      );
    }
    await recordOperation(manager, "lecture", actor, CERTIFICATE_OPERATION_ACTIONS[action], {
      certificateId: id,
      courseId: certificate.courseId,
      subjectId: certificate.userId,
      before,
      after: certificateState(after as any),
      ...(action === "revoke" ? { reason, beforeValid: true, afterValid: false } : {}),
      ...(action === "renew" ? { months } : {}),
      ...(action === "update" ? { changedFields: Object.keys(patch!) } : {}),
      ...(key ? { operationId: key } : {}),
    });
    return after;
  });
}

/** Uses the physical certificate schema; private reasons never enter the public certificate DTO. */
export function revokeLectureCertificate(
  db: DataSource,
  id: string,
  actor: string | undefined,
  reason: unknown = "",
  requestId?: unknown,
) {
  return changeLectureCertificate(db, id, actor, "revoke", {
    reason,
    operationId: requestId,
  });
}

/**
 * Operator recovery queue: completed Lecture enrollments without any certificate (issued or revoked), newest first.
 * The search term is matched literally (`%`, `_`, `\` escaped) against course title and learner name.
 */
export async function listMissingCertificates(
  db: Pick<DataSource, "query">,
  search: unknown,
) {
  const term = typeof search === "string" ? search.trim().slice(0, 100) : "";
  return db.query(
    `SELECT e.id AS "enrollmentId", e."userId", e."courseId", u.name AS "userName", c.title AS "courseTitle"
     FROM lms_enrollments e
     JOIN lms_courses c ON c.id = e."courseId"
     JOIN users u ON u.id = e."userId"
     WHERE c.service_key = 'lecture' AND e.status = 'completed'
       AND NOT EXISTS (SELECT 1 FROM lms_certificates cert WHERE cert."userId" = e."userId" AND cert."courseId" = e."courseId")
       AND ($1 = '' OR c.title ILIKE $2 ESCAPE '\\' OR u.name ILIKE $2 ESCAPE '\\')
     ORDER BY e."updatedAt" DESC, e.id LIMIT 100`,
    [term, `%${term.replace(/[\\%_]/g, "\\$&")}%`],
  );
}

/** Operator-only history page (20 rows). Older revoke rows (beforeValid/afterValid only) stay readable. */
export async function listCertificateOperations(
  db: Pick<DataSource, "query">,
  id: string,
  page: unknown = 1,
) {
  const n = page === undefined ? 1 : Number(page);
  if (!Number.isSafeInteger(n) || n < 1 || n > 10000)
    throw new OperationError(400, "INVALID_PAGE", "이력 페이지를 확인해 주세요.");
  const rows = await db.query(
    `SELECT id, user_id AS "actorId", created_at AS at,
       replace(action_key, 'lecture.certificate_', '') AS action,
       meta->>'reason' AS reason,
       COALESCE(meta->'before', CASE WHEN meta ? 'beforeValid' THEN jsonb_build_object('isValid', meta->'beforeValid') END) AS before,
       COALESCE(meta->'after', CASE WHEN meta ? 'afterValid' THEN jsonb_build_object('isValid', meta->'afterValid') END) AS after,
       meta->'months' AS months, meta->'changedFields' AS "changedFields", meta->>'trigger' AS trigger
     FROM action_logs
     WHERE service_key='lecture' AND status='success' AND action_key = ANY($2::text[])
       AND meta->>'certificateId'=$1
     ORDER BY created_at DESC, id DESC LIMIT 21 OFFSET $3`,
    [id, Object.values(CERTIFICATE_OPERATION_ACTIONS), (n - 1) * 20],
  );
  return { operations: rows.slice(0, 20), page: n, hasMore: rows.length > 20 };
}

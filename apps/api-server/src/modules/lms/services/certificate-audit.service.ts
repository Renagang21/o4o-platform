import { createHash } from "node:crypto";
import type { DataSource, EntityManager } from "typeorm";
import type { Certificate } from "@o4o/lms-core";

export class CertificateOperationError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function certificateReason(input: unknown): string | null {
  if (input === undefined || input === null) return null;
  if (
    typeof input !== "string" ||
    input.includes("\0") ||
    [...input.trim()].length > 2000
  )
    throw new CertificateOperationError(
      400,
      "폐기 사유는 2,000자 이내로 입력해 주세요.",
    );
  return input.trim() || null;
}
function requestKey(input?: string) {
  if (input !== undefined && (typeof input !== "string" || !uuid.test(input)))
    throw new CertificateOperationError(400, "처리 요청 ID를 확인해 주세요.");
  return input;
}
const state = (c: Certificate) => ({
  isValid: c.isValid,
  expiresAt: c.expiresAt?.toISOString() ?? null,
});

/** Lecture-only business audit. Existing action_logs retention applies; no notes in public certificate metadata. */
export class CertificateAuditService {
  constructor(
    private readonly db: DataSource,
    private readonly model?: typeof Certificate,
  ) {}
  private async record(
    m: EntityManager,
    c: Certificate,
    actor: string | undefined,
    action: string,
    details: Record<string, unknown>,
  ) {
    const log = {
      service_key: "lecture",
      user_id: actor ?? null,
      organization_id: null,
      action_key: `lecture.certificate.${action}`,
      source: actor ? "manual" : "system",
      status: "success",
      meta: {
        certificateId: c.id,
        courseId: c.courseId,
        subjectId: c.userId,
        ...details,
      },
    };
    await m.query(
      `INSERT INTO action_logs(service_key,user_id,organization_id,action_key,source,status,meta)
      VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [
        log.service_key,
        log.user_id,
        log.organization_id,
        log.action_key,
        log.source,
        log.status,
        {
          toPostgres: () => JSON.stringify(log.meta),
          toJSON: () => "[redacted]",
        },
      ],
    );
  }
  async issued(c: Certificate, enrollmentId: string, actor?: string) {
    return this.db.transaction(async (m) => {
      const [enrollment] = await m.query(
        'SELECT id,status FROM lms_enrollments WHERE id=$1 AND "userId"=$2 AND "courseId"=$3 FOR UPDATE',
        [enrollmentId, c.userId, c.courseId],
      );
      if (!enrollment || enrollment.status !== "completed")
        throw new CertificateOperationError(
          409,
          "수료 상태가 변경됐습니다. 다시 확인해 주세요.",
        );
      const existing = await m.query(
        'SELECT id FROM lms_certificates WHERE "userId"=$1 AND "courseId"=$2',
        [c.userId, c.courseId],
      );
      if (existing.length)
        throw new CertificateOperationError(
          409,
          "Certificate already issued for this user and course",
        );
      const saved = await m.getRepository(this.model!).save(c);
      await m.query(
        'UPDATE lms_enrollments SET "certificateId"=$1,"updatedAt"=now() WHERE id=$2',
        [saved.id, enrollmentId],
      );
      await this.record(m, saved, actor, "issued", {
        before: null,
        after: state(saved),
      });
      return saved;
    });
  }
  async change(
    id: string,
    action: "revoked" | "renewed" | "updated",
    input: Record<string, unknown>,
    actor?: string,
    operationId?: string,
  ) {
    const key = requestKey(operationId);
    const reason =
      action === "revoked" ? certificateReason(input.reason) : null;
    const months = input.months === undefined ? 12 : input.months;
    if (
      action === "renewed" &&
      (!Number.isSafeInteger(months) || Number(months) < 1)
    )
      throw new CertificateOperationError(
        400,
        "갱신 기간은 1개월 이상의 정수로 입력해 주세요.",
      );
    const hash = createHash("sha256")
      .update(
        JSON.stringify({
          action,
          actor: actor ?? null,
          input:
            action === "revoked"
              ? { reason }
              : action === "renewed"
                ? { months }
                : input,
        }),
      )
      .digest("hex");
    return this.db.transaction(async (m) => {
      const [row] = await m.query(
        `SELECT c.* FROM lms_certificates c JOIN lms_courses course ON course.id=c."courseId"
        WHERE c.id=$1 AND course.service_key='lecture' FOR UPDATE OF c`,
        [id],
      );
      if (!row)
        throw new CertificateOperationError(404, "Certificate not found");
      const certificate = Object.assign(new this.model!(), row);
      if (key) {
        const [prior] = await m.query(
          `SELECT meta FROM action_logs WHERE service_key='lecture'
          AND meta->>'certificateId'=$1 AND meta->>'operationId'=$2
          AND action_key IN ('lecture.certificate.revoked','lecture.certificate.renewed','lecture.certificate.updated') LIMIT 1`,
          [id, key],
        );
        if (prior) {
          if (prior.meta.requestHash !== hash)
            throw new CertificateOperationError(
              409,
              "처리 요청 내용이 변경됐습니다. 새 요청으로 실행해 주세요.",
            );
          return certificate;
        }
      }
      const before = state(certificate);
      if (action === "revoked") {
        if (!certificate.isValid)
          throw new CertificateOperationError(
            409,
            "이미 폐기된 수료증입니다. 이력을 확인해 주세요.",
          );
        certificate.revoke();
      } else if (action === "renewed") {
        certificate.renew(Number(months));
        if (!Number.isFinite(certificate.expiresAt?.getTime()))
          throw new CertificateOperationError(
            400,
            "갱신 기간을 확인해 주세요.",
          );
      } else {
        if (input.isValid !== undefined && typeof input.isValid !== "boolean")
          throw new CertificateOperationError(
            400,
            "유효 상태를 확인해 주세요.",
          );
        const patch = { ...input };
        if (patch.expiresAt !== undefined && patch.expiresAt !== null) {
          const date = new Date(patch.expiresAt as string);
          if (!Number.isFinite(date.getTime()))
            throw new CertificateOperationError(400, "만료일을 확인해 주세요.");
          patch.expiresAt = date;
        }
        Object.assign(certificate, patch);
      }
      const saved = await m.getRepository(this.model!).save(certificate);
      await this.record(m, saved, actor, action, {
        before,
        after: state(saved),
        reason,
        ...(action === "renewed" ? { months } : {}),
        ...(action === "updated" ? { changedFields: Object.keys(input) } : {}),
        ...(key ? { operationId: key, requestHash: hash } : {}),
      });
      return saved;
    });
  }
  async history(id: string, page = 1) {
    if (
      !uuid.test(id) ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 10000
    )
      throw new CertificateOperationError(
        400,
        "수료증 ID와 조회 조건을 확인해 주세요.",
      );
    const [target] = await this.db.query(
      `SELECT c.id FROM lms_certificates c JOIN lms_courses course ON course.id=c."courseId" WHERE c.id=$1 AND course.service_key='lecture'`,
      [id],
    );
    if (!target)
      throw new CertificateOperationError(404, "Certificate not found");
    const rows = await this.db.query(
      `SELECT id,user_id AS "actorId",source,created_at AS at,action_key AS action,
      meta->>'certificateId' AS "certificateId",meta->>'courseId' AS "courseId",meta->>'subjectId' AS "subjectId",
      meta->'before' AS before,meta->'after' AS after,meta->>'reason' AS reason,meta->'months' AS months,meta->'changedFields' AS "changedFields"
      FROM action_logs WHERE service_key='lecture' AND status='success' AND meta->>'certificateId'=$1
      AND action_key IN ('lecture.certificate.issued','lecture.certificate.revoked','lecture.certificate.renewed','lecture.certificate.updated')
      ORDER BY created_at DESC,id DESC LIMIT 21 OFFSET $2`,
      [id, (page - 1) * 20],
    );
    return { items: rows.slice(0, 20), hasMore: rows.length > 20, page };
  }
}

import type { DataSource } from "typeorm";
import {
  assertInboxWriter,
  resolveInboxScope,
} from "../../contact-inquiry/inbox-scope.js";
import {
  OperationError,
  recordOperation,
} from "../../../services/operations/operation-audit.js";

/** Uses the physical certificate schema; private reasons never enter the public certificate DTO. */
export async function revokeLectureCertificate(
  db: DataSource,
  id: string,
  actor: string | undefined,
  reason: unknown = "",
) {
  if (!actor)
    throw new OperationError(
      403,
      "ACTOR_REQUIRED",
      "운영자 인증을 확인해 주세요.",
    );
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
    if (!certificate.isValid) return certificate;
    await manager.query(
      'UPDATE lms_certificates SET "isValid"=false WHERE id=$1',
      [id],
    );
    await recordOperation(
      manager,
      "lecture",
      actor,
      "lecture.certificate_revoke",
      {
        certificateId: id,
        reason: reason.trim(),
        beforeValid: true,
        afterValid: false,
      },
    );
    return { ...certificate, isValid: false };
  });
}

import type { Response } from "express";
import { OperatorRoleContractError } from "../../config/operator-role-catalog.js";
import { DemoAccountForbiddenError } from "../auth/demo-account.service.js";
import { OperationError } from "../operations/operation-audit.js";
import { BranchOperatorDesignationError } from "../kpa-branch/branch-operator-designation.service.js";
import { NeturePharmacyError } from "../../modules/neture-pharmacy/constants.js";
export class ServiceOperatorInvitationError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode = 409,
  ) {
    super(
      (
        {
          FORBIDDEN: "전체관리자의 유효한 지정 권한을 확인할 수 없습니다.",
          INVALID_USER_ID: "대상 계정 식별자가 올바르지 않습니다.",
          USER_NOT_FOUND: "대상 계정을 찾을 수 없습니다.",
          ACCOUNT_INACTIVE:
            "사용할 수 없는 계정입니다. 계정 상태를 확인하세요.",
          GOOGLE_LINK_REQUIRED:
            "Google 계정을 연결한 뒤 운영자 초대를 수락하세요.",
          OPERATOR_ALREADY_ACTIVE:
            "이미 활성 운영자입니다. 기존 권한은 그대로 유지됩니다.",
          INVITATION_SCOPE_CHANGED:
            "초대 범위가 변경되었습니다. 새 초대를 요청하세요.",
          INVALID_EMAIL: "초대 이메일 주소를 확인하세요.",
          USER_SELECTION_REQUIRED:
            "이미 가입된 이메일입니다. 사용자 검색에서 대상 계정을 선택하세요.",
          INVITATION_ALREADY_PENDING:
            "확인 대기 중인 초대가 있습니다. 초대 목록에서 재발송 또는 취소하세요.",
          INVALID_INVITATION_ID: "초대 식별자가 올바르지 않습니다.",
          INVITATION_NOT_FOUND: "초대를 찾을 수 없습니다.",
          INVITATION_MAIL_FAILED:
            "초대 상태는 저장되었지만 메일 발송이 확인되지 않았습니다. 목록을 새로고침하고 1분 후 재발송하거나 취소해 주세요.",
          INVITATION_NOT_PENDING: "이미 수락되거나 취소된 초대입니다.",
          INVITATION_RESEND_TOO_SOON: "재발송은 이전 발송 1분 후 가능합니다.",
          INVALID_OR_EXPIRED_INVITATION:
            "초대가 만료되었거나 취소·처리되었습니다. 메일 링크를 확인하세요.",
          INVITATION_ACCOUNT_MISMATCH:
            "초대받은 계정과 다릅니다. 지정된 계정으로 로그인하세요.",
          OPERATOR_ROLE_REVOKED:
            "운영 권한이 회수되어 확인할 수 없습니다. 전체관리자에게 문의하세요.",
        } as Record<string, string>
      )[code] ?? "초대 요청을 처리할 수 없습니다.",
    );
  }
}
export function invitationFailure(res: Response, error: unknown): void {
  if (error instanceof OperationError) {
    res
      .status(error.status)
      .json({ success: false, code: error.code, error: error.message });
    return;
  }
  if (error instanceof NeturePharmacyError) {
    res
      .status(error.httpStatus)
      .json({ success: false, code: error.code, error: error.message });
    return;
  }
  if (error instanceof BranchOperatorDesignationError) {
    res
      .status(error.statusCode)
      .json({ success: false, code: error.code, error: error.message });
    return;
  }
  if (
    error instanceof ServiceOperatorInvitationError ||
    error instanceof OperatorRoleContractError ||
    error instanceof DemoAccountForbiddenError
  ) {
    res
      .status(error.statusCode)
      .json({ success: false, code: error.code, error: error.message });
    return;
  }
  res.status(500).json({
    success: false,
    code: "INVITATION_UNAVAILABLE",
    error: "운영자 초대 요청을 처리하지 못했습니다.",
  });
}

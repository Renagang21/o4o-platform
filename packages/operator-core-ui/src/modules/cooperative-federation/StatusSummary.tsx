export const participationLabels: Record<string, string> = {
  pending: "심사 대기",
  active: "활성",
  rejected: "반려",
  suspended: "정지",
  withdrawn: "자격 종료",
  admin: "조합 관리자",
  operator: "조합 운영자",
  membership_apply: "개인 가입 신청 접수",
  member_supplement: "가입 보완 제출",
  member_request_changes: "가입 신청 보완 요청",
  member_approve: "가입 승인",
  member_reject: "가입 반려",
  member_suspend: "자격 정지",
  member_restore: "자격 복구",
  member_withdraw: "탈퇴 처리",
  member_expel: "제명 의결 반영",
  member_request_withdraw: "탈퇴 요청 접수",
  role_assign: "관리 역할 지정",
  role_revoke: "관리 역할 해제",
  affiliation_apply: "연합회 가입 신청 접수",
  affiliation_supplement: "조합 신청 보완 제출",
  affiliation_review: "연합회 가입 검토",
  affiliation_request_changes: "조합 신청 보완 요청",
  affiliation_approve: "연합회 가입 승인",
  affiliation_reject: "연합회 가입 반려",
  affiliation_suspend: "조합 운영 정지",
  affiliation_restore: "조합 운영 복구",
};
export function StatusSummary({
  rows,
  noun,
}: Readonly<{ rows: readonly { status: string }[]; noun: string }>) {
  return (
    <div className="card spaced" aria-label={`${noun} 현황`}>
      <strong>
        전체 {rows.length}
        {noun === "조합" ? "개" : "명"}
      </strong>
      <p>
        {["pending", "active", "suspended", "rejected", "withdrawn"]
          .map(
            (s) =>
              `${participationLabels[s]} ${rows.filter((r) => r.status === s).length}`,
          )
          .join(" · ")}
      </p>
    </div>
  );
}

/**
 * candidate-status.util — 공공데이터 후보 상태/매칭 표시 규칙 (UI 전용)
 *
 * WO-O4O-ADMIN-PUBLIC-DATA-CANDIDATE-CLOSED-STATUS-AND-MATCH-BADGE-CLEANUP-V1
 *
 * 종료(등록완료/제외/이력) 후보에는 match_status(unmatched 등) 를 노출하지 않고,
 * 등록 전 후보의 기술 표현(unmatched/conflict)을 업무 의미 문구로 바꾼다.
 * DB/상태/데이터를 변경하지 않는다 — 화면 표시 규칙만 정의한다.
 */

/** 이미 처리·종료된 후보 상태 (match_status 를 화면에 표시하지 않는다) */
export const CLOSED_CANDIDATE_STATUSES: ReadonlySet<string> = new Set([
  'approved_new_master',
  'matched',
  'linked',
  'archived',
  'rejected',
  'merged',
]);

export function isClosedCandidateStatus(status?: string | null): boolean {
  return !!status && CLOSED_CANDIDATE_STATUSES.has(status);
}

/**
 * 화면에 표시할 매칭 문구를 계산한다.
 *  - 종료 상태 → null (뱃지 미표시)
 *  - 등록 전 후보의 unmatched/conflict → 업무 의미 문구
 * null 을 반환하면 호출부는 뱃지 대신 '—' 로 처리한다.
 */
export function matchStatusBusinessLabel(
  candidateStatus?: string | null,
  matchStatus?: string | null,
): string | null {
  if (isClosedCandidateStatus(candidateStatus)) return null;
  if (!matchStatus) return null;
  switch (matchStatus) {
    case 'unmatched':
    case 'no_match':
      return '기존 기본상품 없음';
    case 'conflict':
      return '식별자 충돌 검토';
    case 'exact_identifier_match':
    case 'possible_identifier_match':
      return '기존 기본상품 있음';
    case 'possible_text_match':
      return '유사 상품 있음';
    case 'manually_matched':
      return '수동 매칭됨';
    default:
      return matchStatus;
  }
}

/** 실제 식별자 충돌 후보인지 (상세 제목·행 액션 라벨 분기용) */
export function isConflictCandidate(matchStatus?: string | null): boolean {
  return matchStatus === 'conflict';
}

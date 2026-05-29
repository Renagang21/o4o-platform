/**
 * K-Cosmetics → Canonical Status Mapping
 *
 * WO-O4O-MYPAGE-MY-REQUESTS-INBOX-BACKEND-FOUNDATION-V1
 *
 * Maps K-Cosmetics service-specific status values to the canonical
 * MyRequestStatus set used by @o4o/account-ui MyRequestsInbox.
 *
 * Canonical set:
 *   draft | pending | submitted | approved | rejected |
 *   revision_requested | cancelled | revoked | in_progress | completed
 *
 * Rules:
 * - Does NOT modify DB values — read-only adapter at response layer only.
 * - DB migration is prohibited.
 * - Used by GET /stores/application/me response.
 */

export type CanonicalRequestStatus =
  | 'draft'
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'revision_requested'
  | 'cancelled'
  | 'revoked'
  | 'in_progress'
  | 'completed';

/**
 * cosmetics_store_applications.status → canonical
 *
 * draft     → draft    (작성 중, 미제출)
 * submitted → pending  (제출 완료, 운영자 검토 대기)
 * approved  → approved (매장 신청 승인됨)
 * rejected  → rejected (거부됨)
 */
export function cosmeticsStoreApplicationToCanonical(status: string): CanonicalRequestStatus {
  switch (status) {
    case 'draft':     return 'draft';
    case 'submitted': return 'pending';
    case 'approved':  return 'approved';
    case 'rejected':  return 'rejected';
    default:          return status as CanonicalRequestStatus;
  }
}

/**
 * LMS lms_enrollments.status → canonical (공통 — K-Cosmetics LMS 수강 신청)
 *
 * pending     → pending
 * in_progress → in_progress
 * completed   → completed
 * cancelled   → cancelled
 * expired     → cancelled
 */
export function lmsEnrollmentToCanonical(status: string): CanonicalRequestStatus {
  switch (status) {
    case 'pending':     return 'pending';
    case 'in_progress': return 'in_progress';
    case 'completed':   return 'completed';
    case 'cancelled':   return 'cancelled';
    case 'expired':     return 'cancelled';
    default:            return status as CanonicalRequestStatus;
  }
}

/**
 * forum_category_requests.status → canonical (공통)
 *
 * pending            → pending
 * revision_requested → revision_requested
 * approved           → approved
 * rejected           → rejected
 */
export function forumRequestToCanonical(status: string): CanonicalRequestStatus {
  switch (status) {
    case 'pending':            return 'pending';
    case 'revision_requested': return 'revision_requested';
    case 'approved':           return 'approved';
    case 'rejected':           return 'rejected';
    default:                   return status as CanonicalRequestStatus;
  }
}

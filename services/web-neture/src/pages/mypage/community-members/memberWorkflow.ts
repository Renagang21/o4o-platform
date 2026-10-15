import {
  canApproveJoin,
  type JoinRequestRow,
} from '../../../lib/api/communityOperator';

export type MemberAction =
  | 'approve'
  | 'reject'
  | 'suspend'
  | 'restore'
  | 'withdraw';
export const MEMBER_ACTION_LABEL: Record<MemberAction, string> = {
  approve: '가입 승인',
  reject: '가입 반려',
  suspend: '정지',
  restore: '정지 해제',
  withdraw: '커뮤니티 탈퇴',
};
export const MEMBER_STATUS_LABEL: Record<string, string> = {
  pending: '신청 중',
  active: '이용 중',
  suspended: '이용 정지',
  rejected: '반려',
  withdrawn: '탈퇴',
};
export const MEMBER_ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  operator: 'Operator',
  member: '회원',
};

/** 화면 안내용 판정. 실제 권한·마지막 admin 보호는 기존 서버가 매번 확인한다. */
export function canRunMemberAction(
  row: JoinRequestRow,
  action: MemberAction,
  canRestrict: boolean,
): boolean {
  if (action === 'approve') return canApproveJoin(row);
  if (action === 'reject') return row.status === 'pending';
  if (!canRestrict) return false;
  if (action === 'suspend') return row.status === 'active';
  if (action === 'restore') return row.status === 'suspended';
  return row.status === 'active' || row.status === 'suspended';
}

export function memberReasonError(
  action: MemberAction,
  reason: string,
): string | null {
  if (action === 'approve') return null;
  if (action !== 'reject' && !reason.trim()) return '처리 사유를 입력하세요.';
  return reason.trim().length > 1000
    ? '처리 사유는 1000자 이내로 입력하세요.'
    : null;
}

export function memberActionNotice(
  row: JoinRequestRow,
  action: MemberAction,
): string {
  const target = row.name ?? '회원';
  if (action === 'approve') return `${target} 님의 가입을 승인했습니다.`;
  if (action === 'reject') return `${target} 님의 가입 신청을 반려했습니다.`;
  if (action === 'suspend') return `${target} 님을 정지했습니다.`;
  if (action === 'restore') return `${target} 님의 정지를 해제했습니다.`;
  return `${target} 님의 커뮤니티 탈퇴를 처리했습니다.`;
}

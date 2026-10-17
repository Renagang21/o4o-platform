export type Tab = 'memberships' | 'proposals' | 'events' | 'recruitments' | 'contents';
export type Msg = { type: 'success' | 'error'; text: string } | null;

export const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'memberships', label: '가입 신청' },
  { key: 'proposals', label: '공급 제안' },
  { key: 'events', label: '이벤트' },
  { key: 'recruitments', label: '모집 조건' },
  { key: 'contents', label: '콘텐츠' },
];

export const DEFAULT_STATUS: Record<Tab, string> = {
  memberships: 'pending',
  proposals: 'pending',
  events: 'pending',
  recruitments: 'pending',
  contents: 'all',
};

export const isTab = (v: string | null): v is Tab => TABS.some((t) => t.key === v);

export const FILTERS: Record<Tab, Array<{ value: string; label: string }>> = {
  memberships: [
    { value: 'pending', label: '대기' },
    { value: 'active', label: '활성' },
    { value: 'suspended', label: '정지' },
    { value: 'rejected', label: '반려' },
    { value: 'terminated', label: '종료' },
    { value: '', label: '전체' },
  ],
  proposals: [
    { value: 'pending', label: '대기' },
    { value: 'approved', label: '승인' },
    { value: 'rejected', label: '반려' },
    { value: 'ended', label: '종료' },
    { value: '', label: '전체' },
  ],
  events: [
    { value: 'pending', label: '대기' },
    { value: 'approved', label: '승인' },
    { value: 'rejected', label: '반려' },
    { value: 'canceled', label: '취소' },
    { value: '', label: '전체' },
  ],
  recruitments: [
    { value: 'pending', label: '대기' },
    { value: 'approved', label: '승인' },
    { value: 'rejected', label: '반려' },
    { value: '', label: '전체' },
  ],
  contents: [
    { value: 'all', label: '전체' },
    { value: 'pending', label: '등재 요청' },
    { value: 'rejected', label: '반려' },
    { value: 'draft', label: '초안' },
    { value: 'published', label: '게시' },
    { value: 'archived', label: '보관' },
  ],
};

export const PROPOSAL_ACTIONS: Record<string, Array<{ action: 'approve' | 'reject' | 'end'; label: string }>> = {
  pending: [
    { action: 'approve', label: '승인' },
    { action: 'reject', label: '반려' },
    { action: 'end', label: '종료' },
  ],
  approved: [{ action: 'end', label: '종료' }],
};

export const EVENT_ACTIONS: Record<string, Array<{ action: 'approve' | 'reject' | 'cancel'; label: string }>> = {
  pending: [
    { action: 'approve', label: '승인' },
    { action: 'reject', label: '반려' },
    { action: 'cancel', label: '취소' },
  ],
  approved: [{ action: 'cancel', label: '취소' }],
};

export const CONTENT_ACTIONS: Record<string, Array<{ action: 'publish' | 'archive' | 'reject'; label: string }>> = {
  pending: [{ action: 'publish', label: '승인·게시' }, { action: 'reject', label: '반려' }],
  draft: [
    { action: 'publish', label: '게시' },
    { action: 'archive', label: '보관' },
  ],
  published: [{ action: 'archive', label: '보관' }],
  archived: [{ action: 'publish', label: '다시 게시' }],
};

export const RECRUITMENT_ACTIONS: Record<string, Array<{ action: 'approve' | 'reject'; label: string }>> = {
  pending: [
    { action: 'approve', label: '승인' },
    { action: 'reject', label: '반려' },
  ],
};


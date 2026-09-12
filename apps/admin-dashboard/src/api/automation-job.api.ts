/**
 * Automation Job API — WO-O4O-AUTOMATION-VIDEO-JOB-P0-ADMIN-WORKSPACE-V1
 *
 * /platform/automation-jobs (관리자 전용). 동영상 제작 "임시 작업 슬롯" 상태와 Media asset 연결만 다룬다.
 * 영상 생성·편집은 O4O 밖(Codex / Computer Use / 외부 AI)에서 일어난다.
 */
import { authClient } from '@o4o/auth-client';

export const JOB_STATUSES = ['DRAFT', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELLED'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  DRAFT: '초안',
  IN_PROGRESS: '진행 중',
  WAITING: '대기',
  COMPLETED: '완료',
  CANCELLED: '취소',
};
export const PURPOSES = ['INPUT', 'INTERMEDIATE', 'OUTPUT'] as const;
export type Purpose = (typeof PURPOSES)[number];
export const PURPOSE_LABEL: Record<Purpose, string> = {
  INPUT: '입력 자료',
  INTERMEDIATE: '작업 자료',
  OUTPUT: '최종 결과',
};
export const CLEANUP_DECISIONS = ['KEEP_ALL', 'KEEP_OUTPUTS', 'KEEP_SELECTED', 'DECIDE_LATER'] as const;
export type CleanupDecision = (typeof CLEANUP_DECISIONS)[number];
export const CLEANUP_LABEL: Record<CleanupDecision, string> = {
  KEEP_ALL: '전체 보관',
  KEEP_OUTPUTS: '최종 결과 중심으로 정리',
  KEEP_SELECTED: '선택한 자료 보관',
  DECIDE_LATER: '나중에 결정',
};

export interface AutomationJob {
  id: string;
  type: 'VIDEO';
  title: string;
  createdBy: string;
  status: JobStatus;
  instructions: string | null;
  statusNote: string | null;
  cleanupDecision: CleanupDecision | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
export interface AutomationJobListItem extends AutomationJob {
  assetCounts: Record<Purpose, number>;
}
export interface JobAsset {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  originalName: string;
  assetType: string;
  mimeType: string;
  fileSize: number;
  storageType: string;
  parentAssetId: string | null;
  rootAssetId: string | null;
}
export interface JobAssetLink {
  linkId: string;
  purpose: Purpose;
  createdAt: string;
  asset: JobAsset;
}
export interface AutomationJobDetail extends AutomationJob {
  assets: JobAssetLink[];
}
export type CleanupPlan = 'KEEP' | 'UNLINK_ONLY' | 'DELETE';
export type CleanupResult = 'KEPT' | 'UNLINKED' | 'DELETED' | 'BLOCKED' | 'STORAGE_DELETE_FAILED';
export interface CleanupItem {
  linkId: string;
  purpose: Purpose;
  asset: JobAsset;
  plan: CleanupPlan;
  reason?: 'LINKED_ELSEWHERE' | 'LINEAGE_PROTECTED' | 'SCREEN_SET_IN_USE';
  result?: CleanupResult;
  code?: string;
}
export const CLEANUP_PLAN_LABEL: Record<CleanupPlan, string> = {
  KEEP: '보관',
  UNLINK_ONLY: '관계만 해제 (asset 보존)',
  DELETE: '삭제',
};
export const CLEANUP_REASON_LABEL: Record<NonNullable<CleanupItem['reason']>, string> = {
  LINKED_ELSEWHERE: '다른 작업/상품/콘텐츠에 연결됨',
  LINEAGE_PROTECTED: '다른 자산의 원본(lineage)',
  SCREEN_SET_IN_USE: '타블렛 콘텐츠에서 사용 중',
};
export const CLEANUP_RESULT_LABEL: Record<CleanupResult, string> = {
  KEPT: '보관',
  UNLINKED: '관계만 해제',
  DELETED: '삭제 완료',
  BLOCKED: '삭제 차단 (보존)',
  STORAGE_DELETE_FAILED: 'storage 삭제 실패 (보존)',
};

type Envelope<T> = { success: boolean; data?: T; error?: string; code?: string };
const unwrap = <T,>(res: { data?: Envelope<T> }, fallback: string): T => {
  if (!res.data?.success) throw new Error(res.data?.code || res.data?.error || fallback);
  return res.data.data as T;
};
/** axios 는 4xx/5xx 에서 throw 하므로 응답 본문의 code 를 Error.message 로 정규화한다 (JOB_NOT_FOUND 등). */
const call = async <T,>(p: Promise<{ data?: Envelope<T> }>, fallback: string): Promise<T> => {
  try {
    return unwrap(await p, fallback);
  } catch (e) {
    const body = (e as { response?: { data?: Envelope<T> } }).response?.data;
    if (body) throw new Error(body.code || body.error || fallback);
    throw e;
  }
};
const BASE = '/platform/automation-jobs';

export const listJobs = async (status?: JobStatus) =>
  call<AutomationJobListItem[]>(authClient.api.get<Envelope<AutomationJobListItem[]>>(`${BASE}${status ? `?status=${status}` : ''}`),
    '작업 목록을 불러오지 못했습니다.',
  );
export const createJob = async (input: { title: string; instructions?: string }) =>
  call<AutomationJob>(authClient.api.post<Envelope<AutomationJob>>(BASE, input), '작업 생성에 실패했습니다.');
export const getJob = async (id: string) =>
  call<AutomationJobDetail>(authClient.api.get<Envelope<AutomationJobDetail>>(`${BASE}/${id}`), '작업을 불러오지 못했습니다.');
export const updateJob = async (
  id: string,
  patch: { title?: string; instructions?: string | null; statusNote?: string | null; status?: JobStatus },
) => call<AutomationJob>(authClient.api.patch<Envelope<AutomationJob>>(`${BASE}/${id}`, patch), '저장에 실패했습니다.');
export const completeJob = async (id: string, cleanupDecision: CleanupDecision) =>
  call<AutomationJob>(authClient.api.post<Envelope<AutomationJob>>(`${BASE}/${id}/complete`, { cleanupDecision }),
    '완료 처리에 실패했습니다.',
  );
export const linkAsset = async (id: string, mediaAssetId: string, purpose: Purpose) =>
  call<{ linkId: string }>(authClient.api.post<Envelope<{ linkId: string }>>(`${BASE}/${id}/assets`, { mediaAssetId, purpose }),
    'asset 연결에 실패했습니다.',
  );
export const unlinkAsset = async (id: string, linkId: string) =>
  call<void>(authClient.api.delete<Envelope<void>>(`${BASE}/${id}/assets/${linkId}`), '연결 해제에 실패했습니다.');
export const previewCleanup = async (id: string, decision: CleanupDecision, keepLinkIds: string[] = []) => {
  const qs = new URLSearchParams({ decision });
  if (keepLinkIds.length) qs.set('keepLinkIds', keepLinkIds.join(','));
  return call<{ decision: CleanupDecision; items: CleanupItem[] }>(authClient.api.get<Envelope<{ decision: CleanupDecision; items: CleanupItem[] }>>(`${BASE}/${id}/cleanup-preview?${qs}`),
    '정리 미리보기에 실패했습니다.',
  );
};
export const applyCleanup = async (id: string, decision: CleanupDecision, keepLinkIds: string[] = []) =>
  call<{ decision: CleanupDecision; items: CleanupItem[] }>(authClient.api.post<Envelope<{ decision: CleanupDecision; items: CleanupItem[] }>>(`${BASE}/${id}/cleanup`, {
      decision,
      keepLinkIds,
    }),
    '정리 실행에 실패했습니다.',
  );

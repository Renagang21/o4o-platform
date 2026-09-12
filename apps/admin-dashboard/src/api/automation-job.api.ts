/**
 * Automation Job API — WO-O4O-AUTOMATION-VIDEO-JOB-P0-ADMIN-WORKSPACE-V1
 *
 * /platform/automation-jobs (관리자 전용). 동영상 제작 "임시 작업 슬롯" 상태와 Media asset 연결만 다룬다.
 * 영상 생성·편집은 O4O 밖(Codex / Computer Use / 외부 AI)에서 일어난다.
 *
 * WO-O4O-AUTOMATION-VIDEO-JOB-TEMP-OUTPUT-DOWNLOAD-AND-AUTO-CLEANUP-V1:
 * Media Library 연결은 제작 자료(INPUT · INTERMEDIATE)만. 완성 영상은 임시 output(비공개 저장 · TTL · 자동 삭제)으로
 * 등록·다운로드한다. YouTube / Vimeo / Signage 등 배포는 사용자가 내려받아 직접 한다 — 여기서 연결하지 않는다.
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
/** 읽기 가능한 purpose 전체. OUTPUT 은 이전 방식(Media Library 최종 자료)의 legacy 연결 — 새로 만들 수 없다. */
export const PURPOSES = ['INPUT', 'INTERMEDIATE', 'OUTPUT'] as const;
export type Purpose = (typeof PURPOSES)[number];
/** 새로 연결할 수 있는 purpose — 제작 자료만. */
export const LINKABLE_PURPOSES = ['INPUT', 'INTERMEDIATE'] as const;
export const PURPOSE_LABEL: Record<Purpose, string> = {
  INPUT: '입력 자료',
  INTERMEDIATE: '작업 자료',
  OUTPUT: '이전 방식 최종 자료 (legacy)',
};
/** 제작 자료(Media Library) 정리 방침. 완성 영상 보관 정책이 아니다 — 완성 영상은 항상 임시 TTL 을 따른다. */
export const CLEANUP_DECISIONS = ['KEEP_ALL', 'KEEP_OUTPUTS', 'KEEP_SELECTED', 'DECIDE_LATER'] as const;
export type CleanupDecision = (typeof CLEANUP_DECISIONS)[number];
export const CLEANUP_LABEL: Record<CleanupDecision, string> = {
  KEEP_ALL: '제작 자료 전체 보관',
  KEEP_OUTPUTS: '작업 자료 정리 (입력 자료 보관)',
  KEEP_SELECTED: '선택한 작업 자료만 보관',
  DECIDE_LATER: '나중에 결정',
};

export type TempOutputState = 'NONE' | 'AVAILABLE' | 'EXPIRED';
/** 완성 영상 임시 output 상태. object key · 저장 위치는 API 가 주지 않는다. */
export interface TempOutput {
  state: TempOutputState;
  downloadable: boolean;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  uploadedAt: string | null;
  expiresAt: string | null;
  cleanupPending: boolean;
  ttlHours: number;
}

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
  tempOutput: TempOutput;
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
  tempOutput: TempOutput;
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

// ── 완성 영상 임시 output ──
export const getTempOutput = async (id: string) =>
  call<TempOutput>(authClient.api.get<Envelope<TempOutput>>(`${BASE}/${id}/temp-output`), '완성 영상 상태를 불러오지 못했습니다.');
/** 등록·교체. video/* 파일만. 서버 응답 code 를 그대로 Error.message 로 넘긴다(TEMP_OUTPUT_VIDEO_ONLY 등). */
export const uploadTempOutput = async (id: string, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return call<TempOutput>(
    authClient.api.post<Envelope<TempOutput>>(
      `${BASE}/${id}/temp-output`,
      form,
      // authClient 는 JSON Content-Type 을 강제하므로 업로드에서만 제거해 브라우저가 boundary 를 설정하게 한다
      // (o4o-product-db.api uploadProductMasterImage 와 같은 패턴 — 좁은 타입에 transformRequest 가 없어 as any).
      ({
        transformRequest: (data: unknown, headers?: any) => {
          if (headers?.delete) headers.delete('Content-Type');
          if (headers) { delete headers['Content-Type']; delete headers['content-type']; }
          return data;
        },
      } as any),
    ),
    '완성 영상 등록에 실패했습니다.',
  );
};
export const removeTempOutput = async (id: string) =>
  call<TempOutput>(authClient.api.delete<Envelope<TempOutput>>(`${BASE}/${id}/temp-output`), '완성 영상 제거에 실패했습니다.');
/**
 * 다운로드. 인증 헤더가 필요하므로 <a href> 가 아니라 blob 으로 받아 저장한다.
 * 만료(410 TEMP_OUTPUT_EXPIRED) 등 오류 본문은 blob 이라 code 를 직접 읽어 Error.message 로 넘긴다.
 */
export const downloadTempOutput = async (id: string): Promise<{ blob: Blob; fileName: string }> => {
  try {
    const res = await authClient.api.get<Blob>(`${BASE}/${id}/temp-output/download`, { responseType: 'blob' } as any);
    const disposition = String((res.headers as Record<string, unknown>)['content-disposition'] ?? '');
    const m = /filename\*=UTF-8''([^;]+)/.exec(disposition);
    return { blob: res.data as unknown as Blob, fileName: m ? decodeURIComponent(m[1]) : `video-${id}` };
  } catch (e) {
    const body = (e as { response?: { data?: unknown } }).response?.data;
    if (body instanceof Blob) {
      try {
        const parsed = JSON.parse(await body.text()) as Envelope<unknown>;
        throw new Error(parsed.code || parsed.error || '다운로드에 실패했습니다.');
      } catch (inner) {
        if (inner instanceof Error && inner.message !== 'Unexpected end of JSON input') throw inner;
      }
    }
    throw new Error('다운로드에 실패했습니다.');
  }
};

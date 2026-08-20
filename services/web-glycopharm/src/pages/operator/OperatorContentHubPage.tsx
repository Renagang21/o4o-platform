/**
 * OperatorContentHubPage (GlycoPharm) — 콘텐츠 허브
 *
 * WO-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1:
 *   기존 GlycoPharm 자체 구현(590L, KPA 포팅본 — VIEW_DUPLICATED)을 폐기하고
 *   @o4o/operator-core-ui/modules/operator-content-hub 의 OperatorContentHubConsole 을 소비한다.
 *   서비스 차이는 client(adapter) + config 로만 주입한다.
 *
 * 이전 이력: WO-O4O-GLYCOPHARM-OPERATOR-CONTENT-SUBMENU-ALIGNMENT-V1
 *   - 백엔드: /api/v1/glycopharm/contents (목록/등록/수정/삭제)
 *   - GlycoPharm backend 미구현 기능은 노출하지 않는다:
 *       · copy-to-store / AI 요약·추출·태그 / 상세(detail) 화면 — endpoint·page 부재
 *         → onOpenItem 미주입(제목 클릭 = 수정 모달, orphan route/404 방지)
 *   - status enum 은 GlycoPharm 계약(draft/published/private) 그대로.
 *   - 본문은 GlycoPharm 의 `body` 필드(plain textarea) 사용.
 */

import { OperatorContentHubConsole } from '@o4o/operator-core-ui/modules/operator-content-hub';
import type {
  ContentHubClient,
  ContentHubListParams,
  ContentHubListResult,
  ContentHubPayload,
  ContentHubStatusOption,
} from '@o4o/operator-core-ui/modules/operator-content-hub';
import { getAccessToken } from '../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any)?.error?.message || (body as any)?.error || `API error ${res.status}`);
  return body as T;
}

const client: ContentHubClient = {
  async list(params: ContentHubListParams): Promise<ContentHubListResult> {
    const qs = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
    if (params.search) qs.set('search', params.search);
    if (params.category) qs.set('category', params.category);
    if (params.status) qs.set('status', params.status);
    const data = await apiFetch<{ success: boolean; data: ContentHubListResult }>(`/api/v1/glycopharm/contents?${qs}`);
    if (!data?.success) throw new Error('콘텐츠를 불러올 수 없습니다');
    return data.data;
  },
  async create(payload: ContentHubPayload) {
    await apiFetch('/api/v1/glycopharm/contents', { method: 'POST', body: JSON.stringify(payload) });
  },
  async update(id: string, payload: ContentHubPayload) {
    await apiFetch(`/api/v1/glycopharm/contents/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  async remove(id: string) {
    await apiFetch(`/api/v1/glycopharm/contents/${id}`, { method: 'DELETE' });
  },
};

const STATUS_OPTIONS: ContentHubStatusOption[] = [
  { value: 'draft', label: '초안', badgeClass: 'bg-amber-100 text-amber-700' },
  { value: 'published', label: '공개', badgeClass: 'bg-green-100 text-green-700' },
  { value: 'private', label: '비공개', badgeClass: 'bg-slate-100 text-slate-600' },
];

export default function OperatorContentHubPage() {
  return (
    <OperatorContentHubConsole
      client={client}
      tableId="glycopharm-operator-content-hub"
      title="콘텐츠 허브"
      subtitle="재사용 가능한 콘텐츠를 구조화하여 관리합니다"
      statusOptions={STATUS_OPTIONS}
      defaultStatus="draft"
      allStatusValue=""
      allStatusLabel="전체 상태"
      statCards={[
        { label: '공개 (현재 페이지)', status: 'published', tone: 'green' },
        { label: '초안 (현재 페이지)', status: 'draft', tone: 'amber' },
      ]}
      bodyEditor="plain"
      editorPlaceholder="콘텐츠 본문"
      createButtonLabel="콘텐츠 등록"
    />
  );
}

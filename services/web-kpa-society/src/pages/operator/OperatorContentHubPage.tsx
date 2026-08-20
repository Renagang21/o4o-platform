/**
 * OperatorContentHubPage (KPA) — 콘텐츠 정리 허브
 *
 * WO-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1:
 *   기존 KPA 구현(707L)을 @o4o/operator-core-ui/modules/operator-content-hub 의
 *   OperatorContentHubConsole 로 승격하고, 본 파일은 wrapper 로만 남긴다.
 *   - client(adapter): /api/v1/kpa/contents + mediaApi.upload
 *   - config: status enum(ready/draft) · 카테고리 · RichTextEditor · 상세 이동
 *   - slot: 콘텐츠 제작 가이드 모달
 *   status/노출 정책은 backend 계약 그대로이며 View 가 재해석하지 않는다.
 *
 * 이전 이력:
 *   WO-O4O-KPA-CONTENT-HUB-FOUNDATION-V1
 *   WO-O4O-KPA-OPERATOR-LEGACY-TABLE-CANONICAL-MIGRATION-V1
 *   WO-O4O-KPA-QR-CONTENT-RICH-EDITOR-ADOPTION-V1
 *   WO-O4O-CONTENT-SAVE-MEANS-READY-GLOBAL-STANDARD-V1
 *   WO-O4O-KPA-OPERATOR-CONTENT-LIST-STATUS-FILTER-UX-FIX-V1
 *   WO-O4O-KPA-OPERATOR-DOCS-CONTENT-CREATION-GUIDE-MODAL-V1
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import { OperatorContentHubConsole } from '@o4o/operator-core-ui/modules/operator-content-hub';
import type {
  ContentHubClient,
  ContentHubListParams,
  ContentHubListResult,
  ContentHubPayload,
  ContentHubStatusOption,
} from '@o4o/operator-core-ui/modules/operator-content-hub';
import { ContentCreationGuideModal } from '../pharmacy/ContentCreationGuideModal';
import { getAccessToken } from '../../contexts/AuthContext';
import { mediaApi } from '../../api/media';

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
    const data = await apiFetch<{ success: boolean; data: ContentHubListResult }>(`/api/v1/kpa/contents?${qs}`);
    if (!data?.success) throw new Error('콘텐츠를 불러올 수 없습니다');
    return data.data;
  },
  async get(id: string) {
    const detail = await apiFetch<{ success: boolean; data: { body?: string | null; source_url?: string | null } }>(
      `/api/v1/kpa/contents/${id}`
    );
    return detail?.data ?? {};
  },
  async create(payload: ContentHubPayload) {
    await apiFetch('/api/v1/kpa/contents', { method: 'POST', body: JSON.stringify(payload) });
  },
  async update(id: string, payload: ContentHubPayload) {
    await apiFetch(`/api/v1/kpa/contents/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  async remove(id: string) {
    await apiFetch(`/api/v1/kpa/contents/${id}`, { method: 'DELETE' });
  },
  // WO-O4O-KPA-QR-CONTENT-RICH-EDITOR-ADOPTION-V1: PharmacyBlogPage 와 동일한 canonical 패턴
  async uploadImage(file: File) {
    const res = await mediaApi.upload(file, true, 'kpa-society', 'content-hub');
    if (res.success && res.data) return res.data.url;
    throw new Error(res.error || '이미지 업로드에 실패했습니다.');
  },
};

// WO-O4O-CONTENT-SAVE-MEANS-READY-GLOBAL-STANDARD-V1 + WO-O4O-KPA-OPERATOR-CONTENT-DRAFT-TO-READY-UI-V1 §6.2
const STATUS_OPTIONS: ContentHubStatusOption[] = [
  {
    value: 'ready',
    label: '완료',
    badgeClass: 'bg-green-100 text-green-700',
    formLabel: '완료 (즉시 사용)',
    formHint: '완료: QR 만들기와 매장 허브 콘텐츠 허브 탭에 표시됩니다.',
  },
  {
    value: 'draft',
    label: '초안',
    badgeClass: 'bg-amber-100 text-amber-700',
    formLabel: '초안 (비노출)',
    formHint: '초안: 운영자 콘텐츠 허브에만 보이며 QR·매장 허브에는 표시되지 않습니다.',
  },
];

const CATEGORY_OPTIONS = ['약국경영', '법령/규정', '마케팅', '교육', '공지'];

export default function OperatorContentHubPage() {
  const navigate = useNavigate();
  const [guideOpen, setGuideOpen] = useState(false);

  // WO-O4O-KPA-OPERATOR-DOCS-CONTENT-CREATION-GUIDE-MODAL-V1: 보조(outline) 버튼
  const headerActions = useMemo(() => (
    <button
      onClick={() => setGuideOpen(true)}
      className="flex items-center gap-2 px-4 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
    >
      <Lightbulb className="w-4 h-4" />
      콘텐츠 제작 가이드
    </button>
  ), []);

  return (
    <>
      <OperatorContentHubConsole
        client={client}
        tableId="kpa-operator-content-hub"
        title="콘텐츠 허브 관리"
        subtitle="재사용 가능한 콘텐츠를 구조화하여 관리합니다"
        statusOptions={STATUS_OPTIONS}
        defaultStatus="ready"
        allStatusValue="all"
        allStatusLabel="전체"
        statCards={[
          { label: '완료 (현재 페이지)', status: 'ready', tone: 'green' },
          { label: '초안 (현재 페이지)', status: 'draft', tone: 'amber' },
        ]}
        categoryOptions={CATEGORY_OPTIONS}
        bodyEditor="rich"
        editorPlaceholder="콘텐츠 본문을 작성하세요. 이미지·표·링크를 사용할 수 있습니다."
        requireBodyForManual
        onOpenItem={(item) => navigate(`/operator/content-hub/${item.id}`)}
        createButtonLabel="콘텐츠 만들기"
        headerActions={headerActions}
      />
      <ContentCreationGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} mode="operator" />
    </>
  );
}

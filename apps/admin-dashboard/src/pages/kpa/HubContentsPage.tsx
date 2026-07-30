/**
 * HubContentsPage — HUB 콘텐츠 목록
 *
 * WO-O4O-STORE-CONTENT-HUB-SHARE-UI-PHASE2-V1
 * WO-O4O-HUB-PRODUCER-FILTERING-PHASE3-V1
 * WO-O4O-HUB-NOTICE-SYSTEM-V1
 * WO-O4O-ADMIN-KPA-HUB-STORE-TAB-STALE-UI-REMOVAL-V1 (2026-07-30):
 *   매장 콘텐츠(producer=store) 탭 제거. Store → HUB 게시·공유 흐름은
 *   WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1 (f9164dc4a, 2026-05-09) 에서 정책적으로 폐기되어
 *   생성·승인·조회 경로가 모두 제거되었고, 백엔드 VALID_PRODUCERS 에도 'store' 가 없다.
 *   그 결과 이 탭은 producer=store 요청으로 400 Invalid producer 만 발생시키는 잔재였다.
 *   백엔드 producer 계약과 공용 HubProducer 타입('store' 포함)은 변경하지 않는다 —
 *   3축 생산자 분류 값과 HUB 목록이 실제 제공하는 필터 값은 별개 계약이다.
 *
 * 경로: /operator/hub-contents
 * 기능: 상단 공지 영역 + [전체][공급자 자료] 탭 + 출처 라벨 통일
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import { RefreshCw, Pin } from 'lucide-react';
import type { HubContentItemResponse, HubProducer } from '@o4o/types/hub-content';
import PageHeader from '../../components/common/PageHeader';

// ── Constants ────────────────────────────────────────────────────────────────

const SERVICE_KEY = 'kpa-society';
// authClient.api 의 baseURL 은 이미 `/api/v1` 을 포함한다 (packages/auth-client/src/client.ts getApiUrl).
// 따라서 여기서는 `/api/v1` 접두어를 붙이지 않는다.
const API_BASE = '/hub/contents';

type TabKey = 'all' | 'supplier';

interface TabDef {
  key: TabKey;
  label: string;
  producer?: HubProducer;
  description: string;
}

const TABS: TabDef[] = [
  {
    key: 'all',
    label: '전체',
    // 매장 콘텐츠는 HUB 게시 대상이 아니다(Store → HUB 흐름 폐기) → 실제 통합 대상만 표기.
    description: '공급자, 운영자, 커뮤니티 자료를 통합 조회합니다.',
  },
  {
    key: 'supplier',
    label: '공급자 자료',
    producer: 'supplier',
    description: '공급자가 제공한 공식 마케팅 자료입니다.',
  },
];

const EMPTY_MESSAGES: Record<TabKey, string> = {
  all:      'HUB에 등록된 콘텐츠가 없습니다.',
  supplier: '등록된 공급자 자료가 없습니다.',
};

// WO 기준 출처 라벨 — 'store'는 "매장 활용"으로 표기 (HUB_PRODUCER_LABELS override)
const PRODUCER_LABEL: Record<string, string> = {
  operator:  '운영자',
  supplier:  '공급자',
  community: '커뮤니티',
  store:     '매장 활용',
};

// 출처별 뱃지 색상
const PRODUCER_BADGE_CLASS: Record<string, string> = {
  operator:  'bg-gray-100 text-gray-700',
  supplier:  'bg-purple-50 text-purple-700',
  community: 'bg-blue-50 text-blue-700',
  store:     'bg-teal-50 text-teal-700',
};

// 날짜 표시 — 값이 없거나 파싱 불가면 Invalid Date 대신 '-' 로 표기한다.
function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
}

// ── API ──────────────────────────────────────────────────────────────────────

interface ListResponse {
  success: boolean;
  data: HubContentItemResponse[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface NoticeItem {
  id: string;
  title: string;
  summary: string | null;
  isPinned: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
}

interface NoticeResponse {
  success: boolean;
  data: NoticeItem[];
}

async function fetchHubContents(
  producer: HubProducer | undefined,
  page: number,
): Promise<ListResponse> {
  const params: Record<string, any> = { serviceKey: SERVICE_KEY, page, limit: 20 };
  if (producer) params.producer = producer;
  const res = await authClient.api.get<ListResponse>(API_BASE, { params });
  return res.data;
}

async function fetchNotices(): Promise<NoticeItem[]> {
  const res = await authClient.api.get<NoticeResponse>('/kpa/notices');
  return res.data?.data ?? [];
}

// ── Component ────────────────────────────────────────────────────────────────

export default function HubContentsPage() {
  const [tab, setTab] = useState<TabKey>('all');
  const [page, setPage] = useState(1);

  const activeTab = TABS.find((t) => t.key === tab)!;

  const { data: noticesData } = useQuery({
    queryKey: ['hub-notices-banner'],
    queryFn: fetchNotices,
    staleTime: 60_000,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['hub-contents', tab, page],
    queryFn: () => fetchHubContents(activeTab.producer, page),
  });

  const handleTabChange = (key: TabKey) => {
    setTab(key);
    setPage(1);
  };

  // O4OColumn.render 시그니처는 (value, row, index) 이다 (packages/ui BaseTable).
  // 첫 인자는 row[key] 로 추출된 값이므로 행 전체는 두 번째 인자에서 받는다.
  const columns: O4OColumn<HubContentItemResponse>[] = [
    {
      key: 'title',
      header: '제목',
      render: (_value, row) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{row.title}</p>
          {row.description && (
            <p className="mt-0.5 max-w-sm truncate text-xs text-gray-500">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'producer',
      header: '출처',
      width: 110,
      render: (_value, row) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            PRODUCER_BADGE_CLASS[row.producer] ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          {PRODUCER_LABEL[row.producer] ?? row.producer}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: 110,
      render: (_value, row) => (
        <span className="text-sm text-gray-500">{formatDate(row.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="HUB 콘텐츠"
        subtitle="KPA Society HUB에 등록된 자료를 탭별로 조회합니다."
        actions={[
          { id: 'refresh', label: '새로고침', icon: <RefreshCw size={14} />, onClick: () => refetch() },
        ]}
      />

      {/* 공지 배너 — 최대 3개, isPinned 우선 */}
      {noticesData && noticesData.length > 0 && (
        <div className="mb-4 space-y-2">
          {noticesData.map((notice) => (
            <div
              key={notice.id}
              className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
                notice.isPinned
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-blue-100 bg-blue-50'
              }`}
            >
              {notice.isPinned && (
                <Pin size={14} className="mt-0.5 shrink-0 text-amber-500" />
              )}
              <div>
                <span className="font-medium text-gray-900">{notice.title}</span>
                {notice.summary && (
                  <span className="ml-2 text-gray-500">{notice.summary}</span>
                )}
              </div>
              {notice.expiresAt && (
                <span className="ml-auto shrink-0 text-xs text-gray-400">
                  ~{new Date(notice.expiresAt).toLocaleDateString('ko-KR')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 탭 */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {data && tab === t.key && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  {data.pagination.total}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 설명 */}
      <p className="mb-4 mt-2 text-xs text-gray-500">{activeTab.description}</p>

      {/* 콘텐츠 테이블 */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : isError ? (
        <div className="rounded border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          데이터를 불러오는 중 오류가 발생했습니다.
        </div>
      ) : (
        <BaseTable<HubContentItemResponse>
          columns={columns}
          data={data?.data ?? []}
          emptyMessage={EMPTY_MESSAGES[tab]}
        />
      )}

      {/* 페이지네이션 */}
      {data && data.pagination.totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            이전
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            {page} / {data.pagination.totalPages}
          </span>
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
            disabled={page >= data.pagination.totalPages}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * MyStoreContentsPage — 내 매장 콘텐츠 목록 (KPA)
 *
 * WO-O4O-STORE-CONTENT-HUB-SHARE-UI-PHASE2-V1 (DEPRECATED)
 * WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1 — HUB 공유 요청 흐름 제거
 *
 * 경로: /kpa/my-store-contents
 * 기능: 편집·저장된 매장 콘텐츠 목록 (read-only).
 *
 * Canonical 정책 (WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1):
 *   - Community → Store = copy only
 *   - Store → Community = publish/share 없음
 *   - 매장에서 만든 콘텐츠는 매장 전용. 커뮤니티 노출이 필요하면
 *     처음부터 커뮤니티 영역에서 작성한다.
 */

import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import { RefreshCw } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';

// ── Types ────────────────────────────────────────────────────────────────────

interface StoreContent {
  id: string;
  snapshotId: string;
  title: string;
  updatedAt: string;
}

interface ListResponse {
  success: boolean;
  data: StoreContent[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const API_BASE = '/api/v1/kpa/store-contents';

// ── API ──────────────────────────────────────────────────────────────────────

async function fetchMyContents(): Promise<ListResponse> {
  const res = await authClient.api.get<ListResponse>(API_BASE);
  return res.data;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MyStoreContentsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-store-contents'],
    queryFn: fetchMyContents,
  });

  const columns: O4OColumn<StoreContent>[] = [
    {
      key: 'title',
      header: '콘텐츠 제목',
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">{row.title}</span>
      ),
    },
    {
      key: 'updatedAt',
      header: '최종 수정',
      width: 160,
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.updatedAt).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="내 매장 콘텐츠"
        subtitle="편집·저장한 매장 전용 콘텐츠 목록입니다."
        actions={[
          { id: 'refresh', label: '새로고침', icon: <RefreshCw size={14} />, onClick: () => refetch() },
        ]}
      />

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : isError ? (
        <div className="rounded border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          데이터를 불러오는 중 오류가 발생했습니다.
        </div>
      ) : (
        <BaseTable<StoreContent>
          columns={columns}
          data={data?.data ?? []}
          emptyMessage="편집·저장된 매장 콘텐츠가 없습니다. 자료실에서 자료를 복사·편집하면 여기 표시됩니다."
        />
      )}
    </div>
  );
}

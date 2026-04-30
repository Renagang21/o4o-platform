/**
 * MyStoreContentsPage — 내 매장 콘텐츠 목록 (KPA)
 *
 * WO-O4O-STORE-CONTENT-HUB-SHARE-UI-PHASE2-V1
 *
 * 경로: /kpa/my-store-contents
 * 기능: 편집·저장된 매장 콘텐츠 목록 + HUB 공유 요청
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import { toast } from 'react-hot-toast';
import { Share2, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';

// ── Types ────────────────────────────────────────────────────────────────────

interface StoreContent {
  id: string;
  snapshotId: string;
  title: string;
  updatedAt: string;
  shareStatus: 'pending' | 'approved' | 'rejected' | null;
  sharedAt: string | null;
  sharedRequestId: string | null;
}

interface ListResponse {
  success: boolean;
  data: StoreContent[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const API_BASE = '/api/v1/kpa/store-contents';

const SHARE_STATUS_CONFIG: Record<
  'pending' | 'approved' | 'rejected',
  { label: string; icon: typeof Clock; className: string }
> = {
  pending:  { label: '승인 대기',   icon: Clock,         className: 'text-amber-600 bg-amber-50' },
  approved: { label: 'HUB 공유 중', icon: CheckCircle,   className: 'text-green-700 bg-green-50' },
  rejected: { label: '반려됨',      icon: XCircle,       className: 'text-red-700 bg-red-50' },
};

// ── API ──────────────────────────────────────────────────────────────────────

async function fetchMyContents(): Promise<ListResponse> {
  const res = await authClient.api.get<ListResponse>(API_BASE);
  return res.data;
}

async function requestShare(id: string): Promise<{ success: boolean; data?: any; error?: any }> {
  const res = await authClient.api.post<{ success: boolean; data?: any; error?: any }>(
    `${API_BASE}/${id}/share-to-hub`,
  );
  return res.data;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MyStoreContentsPage() {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-store-contents'],
    queryFn: fetchMyContents,
  });

  const shareMutation = useMutation({
    mutationFn: requestShare,
    onSuccess: (res) => {
      if (res.success) {
        toast.success('HUB 공유 요청이 제출되었습니다. 운영자 승인 후 노출됩니다.');
        queryClient.invalidateQueries({ queryKey: ['my-store-contents'] });
      } else {
        toast.error(res.error?.message ?? '요청 중 오류가 발생했습니다.');
      }
      setConfirmId(null);
    },
    onError: () => {
      toast.error('요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      setConfirmId(null);
    },
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
      width: 120,
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.updatedAt).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
    {
      key: 'shareStatus',
      header: 'HUB 공유 상태',
      width: 150,
      render: (row) => {
        if (!row.shareStatus) {
          return <span className="text-xs text-gray-400">미요청</span>;
        }
        const cfg = SHARE_STATUS_CONFIG[row.shareStatus];
        const Icon = cfg.icon;
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
            <Icon size={12} />
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'id',
      header: '요청',
      width: 140,
      render: (row) => {
        if (row.shareStatus === 'pending') {
          return <span className="text-xs text-amber-600">검토 중...</span>;
        }
        if (row.shareStatus === 'approved') {
          return <span className="text-xs text-green-600">공유 중</span>;
        }
        const isRejected = row.shareStatus === 'rejected';
        return (
          <button
            onClick={() => setConfirmId(row.id)}
            className={`flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-colors ${
              isRejected
                ? 'border border-orange-300 text-orange-700 hover:bg-orange-50'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            disabled={shareMutation.isPending}
          >
            <Share2 size={12} />
            {isRejected ? '재요청' : 'HUB 공유 요청'}
          </button>
        );
      },
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="내 매장 콘텐츠"
        subtitle="편집·저장한 콘텐츠를 HUB에 공유하면 운영자 승인 후 다른 매장 경영자가 참고할 수 있습니다."
        actions={[
          { id: 'refresh', label: '새로고침', icon: <RefreshCw size={14} />, onClick: () => refetch() },
        ]}
      />

      <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-blue-600" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">HUB 공유 안내</p>
          <p className="mt-0.5 text-blue-700">
            HUB에 공유된 콘텐츠는 다른 매장 경영자가 참고용으로 볼 수 있습니다.
            매장명 등 식별 정보는 노출되지 않습니다.
          </p>
        </div>
      </div>

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

      {/* 공유 확인 모달 */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">HUB 공유 요청</h3>
            <p className="mt-2 text-sm text-gray-600">
              HUB에 공유하면 운영자 승인 후 다른 매장 경영자가 볼 수 있습니다.
              <br />
              매장명 등 식별 정보는 노출되지 않습니다.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                disabled={shareMutation.isPending}
              >
                취소
              </button>
              <button
                onClick={() => shareMutation.mutate(confirmId)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={shareMutation.isPending}
              >
                {shareMutation.isPending ? '요청 중...' : '공유 요청'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * MarketingMaterials — 공급자 마케팅 자료 목록
 *
 * WO-O4O-SUPPLIER-CONTENT-SUBMISSION-PHASE1-V1
 *
 * 경로: /supplierops/marketing-materials
 * 기능: 내 제출 목록 + 승인 상태 표시 + 신규 등록 이동
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import { Plus, Clock, CheckCircle, XCircle, RefreshCw, FileText } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';

// ── Types ────────────────────────────────────────────────────────────────────

interface Submission {
  approval_id: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
  title: string | null;
  content_type: string | null;
  content_id: string | null;
}

interface ListResponse {
  success: boolean;
  data: Submission[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const API_BASE = '/api/v1/kpa/supplier/content-submissions';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: '승인 대기', icon: Clock, className: 'text-amber-600 bg-amber-50' },
  approved: { label: '승인됨', icon: CheckCircle, className: 'text-green-700 bg-green-50' },
  rejected: { label: '반려됨', icon: XCircle, className: 'text-red-700 bg-red-50' },
};

const CONTENT_TYPE_LABEL: Record<string, string> = {
  article: '아티클',
  image: '이미지',
  link: '링크',
  product_info: '제품 정보',
};

// ── API ──────────────────────────────────────────────────────────────────────

async function fetchSubmissions(page: number): Promise<ListResponse> {
  const res = await authClient.api.get<ListResponse>(API_BASE, { params: { page, limit: 20 } });
  return res.data;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MarketingMaterials() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['supplier-content-submissions', page],
    queryFn: () => fetchSubmissions(page),
  });

  const columns: O4OColumn<Submission>[] = [
    {
      key: 'title',
      header: '제목',
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">
          {row.title ?? <span className="text-gray-400">(제목 없음)</span>}
        </span>
      ),
    },
    {
      key: 'content_type',
      header: '유형',
      width: 110,
      render: (row) => (
        <span className="text-sm text-gray-600">
          {CONTENT_TYPE_LABEL[row.content_type ?? ''] ?? row.content_type ?? '-'}
        </span>
      ),
    },
    {
      key: 'approval_status',
      header: '승인 상태',
      width: 120,
      render: (row) => {
        const cfg = STATUS_CONFIG[row.approval_status];
        if (!cfg) return <span className="text-xs text-gray-400">{row.approval_status}</span>;
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
      key: 'review_comment',
      header: '운영자 메모',
      render: (row) => (
        <span className="max-w-xs truncate text-sm text-gray-500">
          {row.review_comment ?? '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: '제출일',
      width: 120,
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.created_at).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="마케팅 자료"
        subtitle="제품 홍보 자료를 등록하고 HUB 노출 승인을 요청합니다."
        actions={[
          { id: 'refresh', label: '새로고침', icon: <RefreshCw size={14} />, onClick: () => refetch() },
          { id: 'create', label: '자료 등록', icon: <Plus size={14} />, onClick: () => navigate('/supplierops/marketing-materials/new'), variant: 'primary' },
        ]}
      />

      {/* 안내 배너 */}
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <FileText size={18} className="mt-0.5 flex-shrink-0 text-blue-600" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">마케팅 자료 등록 안내</p>
          <p className="mt-0.5 text-blue-700">
            자료를 등록하면 운영자 검토 후 약사 HUB에 노출됩니다. 승인까지 1~3 영업일이 소요될 수 있습니다.
          </p>
        </div>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : isError ? (
        <div className="rounded border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          데이터를 불러오는 중 오류가 발생했습니다.
        </div>
      ) : (
        <BaseTable<Submission>
          columns={columns}
          data={data?.data ?? []}
          emptyMessage="등록된 마케팅 자료가 없습니다. 자료 등록 버튼을 눌러 첫 번째 자료를 등록해 보세요."
        />
      )}

      {/* 페이지네이션 */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            이전
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            {page} / {data.totalPages}
          </span>
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

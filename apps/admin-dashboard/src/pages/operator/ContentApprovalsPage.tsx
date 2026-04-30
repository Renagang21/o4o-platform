/**
 * ContentApprovalsPage
 *
 * WO-O4O-OPERATOR-CONTENT-APPROVAL-PHASE1-V1
 *
 * 운영자용 콘텐츠 승인 관리 페이지.
 * 공급자 자료 제출(hub_content_submission) +
 * 매장 HUB 공유 요청(store_share_to_hub) 통합 처리.
 *
 * Route: /operator/approvals
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { BaseTable, RowActionMenu } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import { toast } from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, RefreshCw, FileText, Store } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';

// ── Types ────────────────────────────────────────────────────────────────────

type ApprovalStatus = 'pending' | 'approved' | 'rejected';
type EntityType = 'hub_content_submission' | 'store_share_to_hub';

interface ApprovalRequest {
  id: string;
  entity_type: EntityType;
  organization_id: string;
  payload: Record<string, any>;
  status: ApprovalStatus;
  requester_id: string;
  requester_name: string;
  requester_email: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ListResponse {
  success: boolean;
  data: ApprovalRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ENTITY_TYPE_TABS = [
  { value: 'all', label: '전체' },
  { value: 'hub_content_submission', label: '공급자 자료' },
  { value: 'store_share_to_hub', label: '매장 공유' },
] as const;

const STATUS_FILTERS = [
  { value: 'pending', label: '대기중' },
  { value: 'approved', label: '승인됨' },
  { value: 'rejected', label: '반려됨' },
  { value: 'all', label: '전체' },
] as const;

const ENTITY_TYPE_LABEL: Record<EntityType, string> = {
  hub_content_submission: '공급자 자료',
  store_share_to_hub: '매장 공유',
};

const STATUS_BADGE: Record<ApprovalStatus, { label: string; className: string }> = {
  pending: { label: '대기중', className: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '승인', className: 'bg-green-100 text-green-800' },
  rejected: { label: '반려', className: 'bg-red-100 text-red-800' },
};

// ── API ──────────────────────────────────────────────────────────────────────

const API_BASE = '/api/v1/kpa/operator/approvals';

async function fetchApprovals(entityType: string, status: string, page: number): Promise<ListResponse> {
  const params: Record<string, string> = { status, page: String(page), limit: '20' };
  if (entityType !== 'all') params.entity_type = entityType;
  const res = await authClient.api.get<ListResponse>(API_BASE, { params });
  return res.data;
}

async function approveRequest(id: string, comment: string): Promise<void> {
  await authClient.api.post(`${API_BASE}/${id}/approve`, { comment: comment || undefined });
}

async function rejectRequest(id: string, reason: string): Promise<void> {
  await authClient.api.post(`${API_BASE}/${id}/reject`, { reason: reason || undefined });
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ApproveModal({
  request,
  onConfirm,
  onCancel,
  loading,
}: {
  request: ApprovalRequest;
  onConfirm: (comment: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [comment, setComment] = useState('');
  const title = request.payload?.title ?? '(제목 없음)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-semibold text-gray-900">승인 확인</h3>
        <p className="mb-4 text-sm text-gray-600">
          <span className="font-medium">{title}</span>을 승인하시겠습니까?
        </p>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          승인 메모 <span className="text-gray-400">(선택)</span>
        </label>
        <textarea
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          rows={3}
          placeholder="승인 메모를 입력하세요"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            onClick={onCancel}
            disabled={loading}
          >
            취소
          </button>
          <button
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            onClick={() => onConfirm(comment)}
            disabled={loading}
          >
            {loading ? '처리 중...' : '승인'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({
  request,
  onConfirm,
  onCancel,
  loading,
}: {
  request: ApprovalRequest;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  const title = request.payload?.title ?? '(제목 없음)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-semibold text-gray-900">반려 확인</h3>
        <p className="mb-4 text-sm text-gray-600">
          <span className="font-medium">{title}</span>을 반려하시겠습니까?
        </p>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          반려 사유 <span className="text-gray-400">(선택)</span>
        </label>
        <textarea
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          rows={3}
          placeholder="반려 사유를 입력하세요"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            onClick={onCancel}
            disabled={loading}
          >
            취소
          </button>
          <button
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            onClick={() => onConfirm(reason)}
            disabled={loading}
          >
            {loading ? '처리 중...' : '반려'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function ContentApprovalsPage() {
  const queryClient = useQueryClient();

  const [entityTypeTab, setEntityTypeTab] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [page, setPage] = useState(1);

  const [approveTarget, setApproveTarget] = useState<ApprovalRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ApprovalRequest | null>(null);

  const queryKey = ['content-approvals', entityTypeTab, statusFilter, page];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchApprovals(entityTypeTab, statusFilter, page),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => approveRequest(id, comment),
    onSuccess: () => {
      toast.success('승인이 완료되었습니다.');
      setApproveTarget(null);
      queryClient.invalidateQueries({ queryKey: ['content-approvals'] });
    },
    onError: () => {
      toast.error('승인 처리 중 오류가 발생했습니다.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectRequest(id, reason),
    onSuccess: () => {
      toast.success('반려 처리가 완료되었습니다.');
      setRejectTarget(null);
      queryClient.invalidateQueries({ queryKey: ['content-approvals'] });
    },
    onError: () => {
      toast.error('반려 처리 중 오류가 발생했습니다.');
    },
  });

  // ── Table Columns ──

  const columns: O4OColumn<ApprovalRequest>[] = [
    {
      key: 'entity_type',
      header: '유형',
      width: 120,
      render: (row) => {
        const isSupplier = row.entity_type === 'hub_content_submission';
        return (
          <span className="flex items-center gap-1 text-sm">
            {isSupplier ? (
              <FileText size={14} className="text-blue-500" />
            ) : (
              <Store size={14} className="text-purple-500" />
            )}
            {ENTITY_TYPE_LABEL[row.entity_type]}
          </span>
        );
      },
    },
    {
      key: 'title',
      header: '제목',
      accessor: (row) => row.payload?.title ?? '(제목 없음)',
      render: (row) => (
        <span className="max-w-xs truncate text-sm font-medium text-gray-900">
          {row.payload?.title ?? <span className="text-gray-400">(제목 없음)</span>}
        </span>
      ),
    },
    {
      key: 'requester_name',
      header: '작성자',
      width: 140,
      render: (row) => (
        <div className="text-sm">
          <div className="font-medium text-gray-800">{row.requester_name}</div>
          {row.requester_email && (
            <div className="text-xs text-gray-400">{row.requester_email}</div>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: '생성일',
      width: 140,
      render: (row) => (
        <span className="text-sm text-gray-600">
          {new Date(row.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: 90,
      render: (row) => {
        const badge = STATUS_BADGE[row.status as ApprovalStatus];
        return badge ? (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
        ) : (
          <span className="text-xs text-gray-400">{row.status}</span>
        );
      },
    },
    {
      key: '_actions',
      header: '',
      width: 60,
      render: (row) => {
        const isPending = row.status === 'pending';
        return (
          <RowActionMenu
            actions={[
              {
                key: 'approve',
                label: '승인',
                icon: <CheckCircle size={14} />,
                onClick: () => setApproveTarget(row),
                disabled: !isPending,
                variant: 'primary',
              },
              {
                key: 'reject',
                label: '반려',
                icon: <XCircle size={14} />,
                onClick: () => setRejectTarget(row),
                disabled: !isPending,
                variant: 'danger',
              },
            ]}
          />
        );
      },
    },
  ];

  // ── KPI 카운트 (pending 기준) ──

  const pendingCount = data?.total ?? 0;

  return (
    <div className="p-6">
      <PageHeader
        title="콘텐츠 승인 관리"
        description="공급자 자료 제출 및 매장 HUB 공유 요청을 검토하고 승인합니다."
        actions={
          <button
            className="flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={() => refetch()}
          >
            <RefreshCw size={14} />
            새로고침
          </button>
        }
      />

      {/* 탭 — entity_type 필터 */}
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {ENTITY_TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              entityTypeTab === tab.value
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => {
              setEntityTypeTab(tab.value);
              setPage(1);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 상태 필터 + 요약 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {statusFilter === 'pending' && pendingCount > 0 && (
          <span className="flex items-center gap-1 text-sm text-amber-600">
            <Clock size={14} />
            대기 중 {pendingCount}건
          </span>
        )}
      </div>

      {/* 테이블 */}
      {isError ? (
        <div className="rounded border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          데이터를 불러오는 중 오류가 발생했습니다.
        </div>
      ) : (
        <BaseTable<ApprovalRequest>
          columns={columns}
          data={data?.data ?? []}
          loading={isLoading}
          emptyMessage={
            statusFilter === 'pending' ? '대기 중인 승인 요청이 없습니다.' : '해당 조건의 요청이 없습니다.'
          }
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

      {/* 모달 */}
      {approveTarget && (
        <ApproveModal
          request={approveTarget}
          loading={approveMutation.isPending}
          onConfirm={(comment) => approveMutation.mutate({ id: approveTarget.id, comment })}
          onCancel={() => setApproveTarget(null)}
        />
      )}

      {rejectTarget && (
        <RejectModal
          request={rejectTarget}
          loading={rejectMutation.isPending}
          onConfirm={(reason) => rejectMutation.mutate({ id: rejectTarget.id, reason })}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}

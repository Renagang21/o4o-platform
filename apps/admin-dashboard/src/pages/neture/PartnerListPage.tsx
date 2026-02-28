/**
 * Neture Admin Partner List Page
 *
 * Phase D-3: Admin Dashboard에 Neture 서비스 등록
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';

// Types
interface Partner {
  id: string;
  name: string;
  business_name: string | null;
  business_number: string | null;
  type: string;
  status: string;
  /** WO-NETURE-IDENTITY-DOMAIN-STATUS-SEPARATION-V1 */
  identity_status: string | null;
  user_email: string | null;
  description: string | null;
  logo: string | null;
  website: string | null;
  created_at: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ListPartnersResponse {
  data: Partner[];
  meta: PaginationMeta;
}

const TYPE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'seller', label: '판매자' },
  { value: 'supplier', label: '공급자' },
  { value: 'partner', label: '파트너' },
];

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'pending', label: '대기중' },
  { value: 'active', label: '활성' },
  { value: 'suspended', label: '정지' },
  { value: 'inactive', label: '비활성' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  inactive: 'bg-gray-100 text-gray-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '대기중',
  active: '활성',
  suspended: '정지',
  inactive: '비활성',
};

const TYPE_LABELS: Record<string, string> = {
  seller: '판매자',
  supplier: '공급자',
  partner: '파트너',
};

/** WO-NETURE-IDENTITY-DOMAIN-STATUS-SEPARATION-V1: Identity(users.status) 표시 */
const IDENTITY_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  APPROVED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  INACTIVE: 'bg-gray-100 text-gray-700',
};

const IDENTITY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '활성',
  APPROVED: '승인됨',
  PENDING: '대기중',
  SUSPENDED: '정지',
  INACTIVE: '비활성',
};

async function fetchPartners(params: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
}): Promise<ListPartnersResponse> {
  const response = await authClient.api.get('/api/v1/neture/admin/partners', { params });
  return response.data;
}

async function deletePartner(id: string): Promise<void> {
  await authClient.api.delete(`/api/v1/neture/admin/partners/${id}`);
}

async function updatePartnerStatus(id: string, status: string): Promise<void> {
  await authClient.api.patch(`/api/v1/neture/admin/partners/${id}/status`, { status });
}

const PartnerListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['neture', 'admin', 'partners', { page, type, status }],
    queryFn: () => fetchPartners({ page, limit: 20, type: type || undefined, status: status || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePartner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neture', 'admin', 'partners'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updatePartnerStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neture', 'admin', 'partners'] });
    },
  });

  const handleDelete = (partner: Partner) => {
    if (window.confirm(`"${partner.name}" 파트너를 삭제하시겠습니까?`)) {
      deleteMutation.mutate(partner.id);
    }
  };

  const handleStatusChange = (partner: Partner, newStatus: string) => {
    if (newStatus !== partner.status) {
      statusMutation.mutate({ id: partner.id, status: newStatus });
    }
  };

  if (error) {
    return (
      <div className="p-6 text-red-600">
        파트너 목록을 불러오는데 실패했습니다.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Neture 파트너 관리</h1>
          <p className="text-gray-500 mt-1">판매자, 공급자, 파트너를 관리합니다.</p>
        </div>
        <Link
          to="/neture/partners/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 파트너 등록
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
            <select
              value={type}
              onChange={(e) => { setType(e.target.value); setPage(1); }}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Partners Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : data?.data && data.data.length > 0 ? (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">로고</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">파트너명</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">사업자명</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">유형</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Identity 상태</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Domain 상태</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">등록일</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((partner) => (
                  <tr key={partner.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center">
                        {partner.logo ? (
                          <img src={partner.logo} alt={partner.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-400 text-sm font-bold">
                            {partner.name.charAt(0)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/neture/partners/${partner.id}`} className="text-blue-600 hover:underline font-medium">
                        {partner.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {partner.business_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {TYPE_LABELS[partner.type] || partner.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {partner.identity_status ? (
                        <span className={`px-2 py-1 text-xs rounded ${IDENTITY_STATUS_COLORS[partner.identity_status] || 'bg-gray-100 text-gray-700'}`}>
                          {IDENTITY_STATUS_LABELS[partner.identity_status] || partner.identity_status}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                      {partner.user_email && (
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[120px]" title={partner.user_email}>
                          {partner.user_email}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={partner.status}
                        onChange={(e) => handleStatusChange(partner, e.target.value)}
                        className={`px-2 py-1 text-xs rounded border-0 ${STATUS_COLORS[partner.status] || 'bg-gray-100'}`}
                      >
                        {STATUS_OPTIONS.filter((s) => s.value).map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(partner.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          to={`/neture/partners/${partner.id}`}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          편집
                        </Link>
                        <button
                          onClick={() => handleDelete(partner)}
                          disabled={deleteMutation.isPending}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-gray-500">
                  총 {data.meta.total}개 중 {(page - 1) * data.meta.limit + 1}-{Math.min(page * data.meta.limit, data.meta.total)}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
                  >
                    이전
                  </button>
                  <span className="px-3 py-1">{page} / {data.meta.totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                    disabled={page === data.meta.totalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            등록된 파트너가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerListPage;

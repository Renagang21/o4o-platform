/**
 * Neture Admin Supplier List Page
 *
 * WO-NETURE-IDENTITY-DOMAIN-STATUS-SEPARATION-V1:
 * Identity(users.status)와 Domain(neture_suppliers.status) 이중 상태 표시
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';

interface Supplier {
  id: string;
  name: string;
  slug: string;
  status: string;
  contactEmail: string;
  userId: string;
  identityStatus: string | null;
  userEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

const DOMAIN_STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'PENDING', label: '대기중' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'INACTIVE', label: '비활성' },
  { value: 'REJECTED', label: '거절' },
];

const DOMAIN_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const DOMAIN_STATUS_LABELS: Record<string, string> = {
  PENDING: '대기중',
  ACTIVE: '활성',
  INACTIVE: '비활성',
  REJECTED: '거절',
};

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

async function fetchSuppliers(params: { status?: string }): Promise<Supplier[]> {
  const response = await authClient.api.get('/api/v1/neture/admin/suppliers', { params });
  return response.data;
}

async function approveSupplier(id: string): Promise<void> {
  await authClient.api.post(`/api/v1/neture/admin/suppliers/${id}/approve`);
}

async function rejectSupplier(id: string): Promise<void> {
  await authClient.api.post(`/api/v1/neture/admin/suppliers/${id}/reject`);
}

async function deactivateSupplier(id: string): Promise<void> {
  await authClient.api.post(`/api/v1/neture/admin/suppliers/${id}/deactivate`);
}

const SupplierListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const { data: suppliers, isLoading, error } = useQuery({
    queryKey: ['neture', 'admin', 'suppliers', { status: statusFilter }],
    queryFn: () => fetchSuppliers({ status: statusFilter || undefined }),
  });

  const approveMutation = useMutation({
    mutationFn: approveSupplier,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['neture', 'admin', 'suppliers'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: rejectSupplier,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['neture', 'admin', 'suppliers'] }),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateSupplier,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['neture', 'admin', 'suppliers'] }),
  });

  const handleApprove = (supplier: Supplier) => {
    if (window.confirm(`"${supplier.name}" 공급자를 승인하시겠습니까?`)) {
      approveMutation.mutate(supplier.id);
    }
  };

  const handleReject = (supplier: Supplier) => {
    if (window.confirm(`"${supplier.name}" 공급자를 거절하시겠습니까?`)) {
      rejectMutation.mutate(supplier.id);
    }
  };

  const handleDeactivate = (supplier: Supplier) => {
    if (window.confirm(`"${supplier.name}" 공급자를 비활성화하시겠습니까?`)) {
      deactivateMutation.mutate(supplier.id);
    }
  };

  if (error) {
    return (
      <div className="p-6 text-red-600">
        공급자 목록을 불러오는데 실패했습니다.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Neture 공급자 관리</h1>
        <p className="text-gray-500 mt-1">
          공급자 등록 승인 및 상태를 관리합니다.
          <span className="text-xs text-gray-400 ml-2">Identity = 플랫폼 계정 상태 / Domain = 공급자 도메인 상태</span>
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domain 상태</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {DOMAIN_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : suppliers && suppliers.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">공급자명</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Slug</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">연락처</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Identity 상태</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Domain 상태</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">등록일</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{supplier.name}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {supplier.slug}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {supplier.contactEmail || '-'}
                    {supplier.userEmail && supplier.userEmail !== supplier.contactEmail && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{supplier.userEmail}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {supplier.identityStatus ? (
                      <span className={`px-2 py-1 text-xs rounded ${IDENTITY_STATUS_COLORS[supplier.identityStatus] || 'bg-gray-100 text-gray-700'}`}>
                        {IDENTITY_STATUS_LABELS[supplier.identityStatus] || supplier.identityStatus}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${DOMAIN_STATUS_COLORS[supplier.status] || 'bg-gray-100 text-gray-700'}`}>
                      {DOMAIN_STATUS_LABELS[supplier.status] || supplier.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(supplier.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {supplier.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(supplier)}
                            disabled={approveMutation.isPending}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                          >
                            도메인 승인
                          </button>
                          <button
                            onClick={() => handleReject(supplier)}
                            disabled={rejectMutation.isPending}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                          >
                            거절
                          </button>
                        </>
                      )}
                      {supplier.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleDeactivate(supplier)}
                          disabled={deactivateMutation.isPending}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                          비활성화
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 text-gray-500">
            등록된 공급자가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierListPage;

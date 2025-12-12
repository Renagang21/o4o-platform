/**
 * CosmeticsPartnerCommissionPolicies Page
 *
 * 파트너 커미션 정책 관리 페이지
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';

interface CommissionPolicy {
  id: string;
  name: string;
  policyType: 'PERCENT' | 'FIXED';
  commissionRate: number;
  fixedAmount: number;
  partnerId?: string;
  productId?: string;
  campaignId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  priority: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResult {
  items: CommissionPolicy[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PolicyStatistics {
  totalPolicies: number;
  activePolicies: number;
  byType: {
    PERCENT: number;
    FIXED: number;
  };
}

const CosmeticsPartnerCommissionPolicies: React.FC = () => {
  const api = authClient.api;
  const [policies, setPolicies] = useState<CommissionPolicy[]>([]);
  const [statistics, setStatistics] = useState<PolicyStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CommissionPolicy | null>(null);
  const [showSimulateModal, setShowSimulateModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    policyType: 'PERCENT' as 'PERCENT' | 'FIXED',
    commissionRate: 0.1,
    fixedAmount: 1000,
    partnerId: '',
    productId: '',
    campaignId: '',
    effectiveFrom: '',
    effectiveTo: '',
    priority: 0,
    isActive: true,
  });

  // Simulate form state
  const [simulateData, setSimulateData] = useState({
    partnerId: '',
    eventType: 'SALE' as 'CLICK' | 'CONVERSION' | 'SALE',
    eventValue: 100000,
    productId: '',
    campaignId: '',
  });
  const [simulateResult, setSimulateResult] = useState<{
    amount: number;
    breakdown: string;
    policyId: string | null;
  } | null>(null);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/cosmetics-partner/commission-policies?page=${page}&limit=10`);
      if (response.data.success) {
        const result: PaginatedResult = response.data.data;
        setPolicies(result.items);
        setTotalPages(result.totalPages);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch policies');
    } finally {
      setLoading(false);
    }
  }, [api, page]);

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await api.get('/api/v1/cosmetics-partner/commission-policies/statistics');
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  }, [api]);

  useEffect(() => {
    fetchPolicies();
    fetchStatistics();
  }, [fetchPolicies, fetchStatistics]);

  const handleCreate = async () => {
    try {
      const payload = {
        ...formData,
        commissionRate: formData.policyType === 'PERCENT' ? formData.commissionRate : 0,
        fixedAmount: formData.policyType === 'FIXED' ? formData.fixedAmount : 0,
        partnerId: formData.partnerId || undefined,
        productId: formData.productId || undefined,
        campaignId: formData.campaignId || undefined,
        effectiveFrom: formData.effectiveFrom || undefined,
        effectiveTo: formData.effectiveTo || undefined,
      };

      const response = await api.post('/api/v1/cosmetics-partner/commission-policies', payload);
      if (response.data.success) {
        setShowCreateModal(false);
        resetForm();
        fetchPolicies();
        fetchStatistics();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create policy');
    }
  };

  const handleUpdate = async () => {
    if (!editingPolicy) return;

    try {
      const payload = {
        ...formData,
        commissionRate: formData.policyType === 'PERCENT' ? formData.commissionRate : 0,
        fixedAmount: formData.policyType === 'FIXED' ? formData.fixedAmount : 0,
        partnerId: formData.partnerId || undefined,
        productId: formData.productId || undefined,
        campaignId: formData.campaignId || undefined,
        effectiveFrom: formData.effectiveFrom || undefined,
        effectiveTo: formData.effectiveTo || undefined,
      };

      const response = await api.put(`/api/v1/cosmetics-partner/commission-policies/${editingPolicy.id}`, payload);
      if (response.data.success) {
        setEditingPolicy(null);
        resetForm();
        fetchPolicies();
        fetchStatistics();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update policy');
    }
  };

  const handleToggleActive = async (policy: CommissionPolicy) => {
    try {
      const response = await api.patch(`/api/v1/cosmetics-partner/commission-policies/${policy.id}/active`, {
        isActive: !policy.isActive,
      });
      if (response.data.success) {
        fetchPolicies();
        fetchStatistics();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update policy status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 정책을 삭제하시겠습니까?')) return;

    try {
      const response = await api.delete(`/api/v1/cosmetics-partner/commission-policies/${id}`);
      if (response.data.success) {
        fetchPolicies();
        fetchStatistics();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete policy');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await api.post(`/api/v1/cosmetics-partner/commission-policies/${id}/duplicate`);
      if (response.data.success) {
        fetchPolicies();
        fetchStatistics();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate policy');
    }
  };

  const handleSimulate = async () => {
    try {
      const response = await api.post('/api/v1/cosmetics-partner/commission/simulate', {
        ...simulateData,
        productId: simulateData.productId || undefined,
        campaignId: simulateData.campaignId || undefined,
      });
      if (response.data.success) {
        setSimulateResult(response.data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to simulate commission');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      policyType: 'PERCENT',
      commissionRate: 0.1,
      fixedAmount: 1000,
      partnerId: '',
      productId: '',
      campaignId: '',
      effectiveFrom: '',
      effectiveTo: '',
      priority: 0,
      isActive: true,
    });
  };

  const openEditModal = (policy: CommissionPolicy) => {
    setFormData({
      name: policy.name,
      policyType: policy.policyType,
      commissionRate: Number(policy.commissionRate),
      fixedAmount: Number(policy.fixedAmount),
      partnerId: policy.partnerId || '',
      productId: policy.productId || '',
      campaignId: policy.campaignId || '',
      effectiveFrom: policy.effectiveFrom ? policy.effectiveFrom.split('T')[0] : '',
      effectiveTo: policy.effectiveTo ? policy.effectiveTo.split('T')[0] : '',
      priority: policy.priority,
      isActive: policy.isActive,
    });
    setEditingPolicy(policy);
  };

  const formatRate = (rate: number) => `${(rate * 100).toFixed(2)}%`;
  const formatAmount = (amount: number) => `${amount.toLocaleString()}원`;

  if (loading && policies.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">커미션 정책 관리</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSimulateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            커미션 시뮬레이션
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + 새 정책 만들기
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 text-sm">전체 정책</div>
            <div className="text-2xl font-bold">{statistics.totalPolicies}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 text-sm">활성 정책</div>
            <div className="text-2xl font-bold text-green-600">{statistics.activePolicies}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 text-sm">정률 정책</div>
            <div className="text-2xl font-bold text-blue-600">{statistics.byType.PERCENT}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 text-sm">정액 정책</div>
            <div className="text-2xl font-bold text-purple-600">{statistics.byType.FIXED}</div>
          </div>
        </div>
      )}

      {/* Policies Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">정책명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">유형</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">커미션</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">적용 대상</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">우선순위</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {policies.map((policy) => (
              <tr key={policy.id} className={!policy.isActive ? 'bg-gray-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium">{policy.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      policy.policyType === 'PERCENT'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {policy.policyType === 'PERCENT' ? '정률' : '정액'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {policy.policyType === 'PERCENT'
                    ? formatRate(policy.commissionRate)
                    : formatAmount(policy.fixedAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {policy.partnerId && <span className="block">파트너 특정</span>}
                  {policy.productId && <span className="block">상품 특정</span>}
                  {policy.campaignId && <span className="block">캠페인 특정</span>}
                  {!policy.partnerId && !policy.productId && !policy.campaignId && (
                    <span className="text-gray-400">전체 적용</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-600">{policy.priority}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleActive(policy)}
                    className={`px-2 py-1 text-xs rounded ${
                      policy.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {policy.isActive ? '활성' : '비활성'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => openEditModal(policy)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDuplicate(policy.id)}
                    className="text-green-600 hover:text-green-800 mr-3"
                  >
                    복제
                  </button>
                  <button
                    onClick={() => handleDelete(policy.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {policies.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  등록된 정책이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            이전
          </button>
          <span className="px-3 py-1">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPolicy) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingPolicy ? '정책 수정' : '새 정책 만들기'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">정책명 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  placeholder="예: 기본 커미션 정책"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">정책 유형</label>
                <select
                  value={formData.policyType}
                  onChange={(e) =>
                    setFormData({ ...formData, policyType: e.target.value as 'PERCENT' | 'FIXED' })
                  }
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                >
                  <option value="PERCENT">정률 (퍼센트)</option>
                  <option value="FIXED">정액 (고정 금액)</option>
                </select>
              </div>

              {formData.policyType === 'PERCENT' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    커미션 비율 (0.01 = 1%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.commissionRate}
                    onChange={(e) =>
                      setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    현재: {(formData.commissionRate * 100).toFixed(2)}%
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700">고정 금액 (원)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.fixedAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, fixedAmount: parseInt(e.target.value) || 0 })
                    }
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">우선순위</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                  }
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                />
                <p className="text-sm text-gray-500 mt-1">높을수록 우선 적용됩니다.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">적용 시작일</label>
                  <input
                    type="date"
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">적용 종료일</label>
                  <input
                    type="date"
                    value={formData.effectiveTo}
                    onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">파트너 ID (선택)</label>
                <input
                  type="text"
                  value={formData.partnerId}
                  onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  placeholder="특정 파트너에만 적용 시 입력"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">상품 ID (선택)</label>
                <input
                  type="text"
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  placeholder="특정 상품에만 적용 시 입력"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">활성화</label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPolicy(null);
                  resetForm();
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={editingPolicy ? handleUpdate : handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editingPolicy ? '수정' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulate Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">커미션 시뮬레이션</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">파트너 ID *</label>
                <input
                  type="text"
                  value={simulateData.partnerId}
                  onChange={(e) => setSimulateData({ ...simulateData, partnerId: e.target.value })}
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">이벤트 타입</label>
                <select
                  value={simulateData.eventType}
                  onChange={(e) =>
                    setSimulateData({
                      ...simulateData,
                      eventType: e.target.value as 'CLICK' | 'CONVERSION' | 'SALE',
                    })
                  }
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                >
                  <option value="CLICK">클릭</option>
                  <option value="CONVERSION">전환</option>
                  <option value="SALE">판매</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">이벤트 금액 (원)</label>
                <input
                  type="number"
                  value={simulateData.eventValue}
                  onChange={(e) =>
                    setSimulateData({ ...simulateData, eventValue: parseInt(e.target.value) || 0 })
                  }
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">상품 ID (선택)</label>
                <input
                  type="text"
                  value={simulateData.productId}
                  onChange={(e) => setSimulateData({ ...simulateData, productId: e.target.value })}
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                />
              </div>

              {simulateResult && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    예상 커미션: {simulateResult.amount.toLocaleString()}원
                  </div>
                  <div className="text-sm text-gray-600 mt-2">{simulateResult.breakdown}</div>
                  {simulateResult.policyId && (
                    <div className="text-xs text-gray-400 mt-1">
                      적용 정책 ID: {simulateResult.policyId}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowSimulateModal(false);
                  setSimulateResult(null);
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                닫기
              </button>
              <button
                onClick={handleSimulate}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                시뮬레이션 실행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmeticsPartnerCommissionPolicies;

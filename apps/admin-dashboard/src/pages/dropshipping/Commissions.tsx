/**
 * Dropshipping Commissions Page
 *
 * WO-O4O-TABLE-DATATABLE-DEPRECATION-V1B — BaseTable 직접 사용으로 마이그레이션
 */

import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, Calendar, TrendingUp, Settings, Award, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authClient } from '@o4o/auth-client';
import PageHeader from '../../components/common/PageHeader';
import { BaseTable, RowActionMenu } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';

interface CommissionPolicy {
  id: string;
  title: string;
  supplier: string;
  partnerGrades: string[];
  commissionRate: number;
  minOrderAmount: number;
  startDate: string;
  endDate?: string;
  status: 'active' | 'scheduled' | 'expired';
  createdAt: string;
}

const Commissions: React.FC = () => {
  const [policies, setPolicies] = useState<CommissionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<CommissionPolicy | null>(null);

  useEffect(() => { fetchCommissionPolicies(); }, []);

  const fetchCommissionPolicies = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/admin/dropshipping/commission-policies');
      setPolicies(response.data.policies || []);
    } catch (error) {
      console.error('Error fetching commission policies:', error);
      toast.error('Error loading commission policies');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: '활성', class: 'bg-green-100 text-green-800' },
      scheduled: { label: '예약됨', class: 'bg-blue-100 text-blue-800' },
      expired: { label: '만료됨', class: 'bg-gray-100 text-gray-800' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, class: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}>
        {config.label}
      </span>
    );
  };

  const getGradeLabels = (grades: string[]) => {
    const gradeLabels: Record<string, string> = { bronze: '브론즈', silver: '실버', gold: '골드', platinum: '플래티넘' };
    return grades.map((g) => gradeLabels[g] || g).join(', ');
  };

  const handleDelete = (id: string) => {
    setPolicies(policies.filter((p) => p.id !== id));
    toast.success('정책이 삭제되었습니다');
  };

  const handleCreate = () => { setSelectedPolicy(null); setShowForm(true); };
  const handleEdit = (policy: CommissionPolicy) => { setSelectedPolicy(policy); setShowForm(true); };

  const stats = {
    total: policies.length,
    active: policies.filter((p) => p.status === 'active').length,
    avgRate: policies.length > 0 ? (policies.reduce((sum, p) => sum + p.commissionRate, 0) / policies.length).toFixed(1) : 0,
    scheduled: policies.filter((p) => p.status === 'scheduled').length,
  };

  const columns: O4OColumn<CommissionPolicy>[] = [
    {
      key: 'title',
      header: '정책명',
      render: (_, row) => (
        <div>
          <button onClick={() => handleEdit(row)} className="text-blue-600 hover:text-blue-800 font-medium">
            {row.title}
          </button>
          <div className="text-sm text-gray-500 mt-1">공급자: {row.supplier}</div>
        </div>
      ),
    },
    {
      key: 'partnerGrades',
      header: '적용 등급',
      render: (_, row) => <span className="text-sm">{getGradeLabels(row.partnerGrades)}</span>,
    },
    {
      key: 'commissionRate',
      header: '수수료율',
      align: 'center',
      sortable: true,
      sortAccessor: (row) => row.commissionRate,
      render: (_, row) => <strong className="text-lg text-blue-600">{row.commissionRate}%</strong>,
    },
    {
      key: 'minOrderAmount',
      header: '최소 주문금액',
      align: 'right',
      sortable: true,
      sortAccessor: (row) => row.minOrderAmount,
      render: (_, row) => row.minOrderAmount > 0 ? (
        <span>₩{row.minOrderAmount.toLocaleString()}</span>
      ) : (
        <span className="text-gray-400">제한 없음</span>
      ),
    },
    {
      key: 'period',
      header: '기간',
      render: (_, row) => (
        <div className="text-sm">
          <div>{new Date(row.startDate).toLocaleDateString('ko-KR')}</div>
          {row.endDate && <div className="text-gray-500">~ {new Date(row.endDate).toLocaleDateString('ko-KR')}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      render: (_, row) => getStatusBadge(row.status),
    },
    {
      key: '_actions',
      header: '',
      width: 56,
      system: true,
      align: 'center',
      render: (_, row) => (
        <RowActionMenu
          actions={[
            { key: 'edit', label: '편집', icon: <Edit2 size={14} />, onClick: () => handleEdit(row) },
            { key: 'delete', label: '삭제', icon: <Trash2 size={14} />, variant: 'danger', confirm: '이 정책을 삭제하시겠습니까?', onClick: () => handleDelete(row.id) },
          ]}
        />
      ),
    },
  ];

  if (showForm) {
    return <CommissionPolicyForm policy={selectedPolicy} onClose={() => setShowForm(false)} />;
  }

  return (
    <div className="p-6">
      <PageHeader
        title="수수료 정책"
        subtitle="파트너 수수료 정책을 관리합니다"
        actions={[
          { id: 'refresh', label: '새로고침', icon: <RefreshCw className="w-4 h-4" />, onClick: fetchCommissionPolicies, variant: 'secondary' as const },
          { id: 'add-policy', label: '새로 추가', icon: <Plus className="w-4 h-4" />, onClick: handleCreate, variant: 'primary' as const },
        ]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div><p className="text-gray-600 text-sm">전체 정책</p><p className="text-2xl font-bold">{stats.total}</p></div>
            <Settings className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div><p className="text-gray-600 text-sm">활성 정책</p><p className="text-2xl font-bold">{stats.active}</p></div>
            <TrendingUp className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div><p className="text-gray-600 text-sm">평균 수수료율</p><p className="text-2xl font-bold">{stats.avgRate}%</p></div>
            <DollarSign className="h-8 w-8 text-purple-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div><p className="text-gray-600 text-sm">예약된 정책</p><p className="text-2xl font-bold">{stats.scheduled}</p></div>
            <Calendar className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="animate-pulse p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
          </div>
        ) : (
          <BaseTable<CommissionPolicy>
            columns={columns}
            data={policies}
            rowKey={(row) => row.id}
            emptyMessage="수수료 정책이 없습니다"
            tableId="dropshipping-commissions"
            columnVisibility
            persistState
          />
        )}
      </div>
    </div>
  );
};

// Commission Policy Form Component (inline for simplicity)
const CommissionPolicyForm: React.FC<{ policy: CommissionPolicy | null; onClose: () => void }> = ({ policy, onClose }) => {
  const [formData, setFormData] = useState({
    title: policy?.title || '',
    supplier: policy?.supplier || '전체 공급자',
    partnerGrades: policy?.partnerGrades || ['bronze', 'silver', 'gold', 'platinum'],
    commissionRate: policy?.commissionRate || 10,
    minOrderAmount: policy?.minOrderAmount || 0,
    startDate: policy?.startDate || '',
    endDate: policy?.endDate || '',
  });

  const handleSave = () => {
    toast.success(policy ? '정책이 수정되었습니다' : '정책이 생성되었습니다');
    onClose();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-normal text-gray-900">
          {policy ? '수수료 정책 편집' : '새 수수료 정책'}
        </h1>
      </div>

      <div className="bg-white border border-gray-300 rounded-lg p-6 max-w-4xl">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">정책명 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-o4o-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">수수료율 (%)</label>
            <input
              type="number"
              value={formData.commissionRate}
              onChange={(e) => setFormData({ ...formData, commissionRate: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-o4o-blue focus:outline-none"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">시작일</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-o4o-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">종료일 (선택)</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-o4o-blue focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">취소</button>
          <button onClick={handleSave} className="px-4 py-2 bg-o4o-blue text-white rounded hover:bg-o4o-blue-hover">
            {policy ? '업데이트' : '정책 생성'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Commissions;

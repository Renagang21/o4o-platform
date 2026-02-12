import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, Users, Calendar, TrendingUp, Settings, Award, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authClient } from '@o4o/auth-client';
import PageHeader from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';

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
  const [bulkSelection, setBulkSelection] = useState<string[]>([]);

  useEffect(() => {
    fetchCommissionPolicies();
  }, []);

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
      expired: { label: '만료됨', class: 'bg-gray-100 text-gray-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}>
        {config.label}
      </span>
    );
  };

  const getGradeLabels = (grades: string[]) => {
    const gradeLabels: any = {
      bronze: '브론즈',
      silver: '실버',
      gold: '골드',
      platinum: '플래티넘'
    };
    
    return grades.map(g => gradeLabels[g]).join(', ');
  };

  const handleDelete = (id: string) => {
    if (confirm('정책을 삭제하시겠습니까?')) {
      setPolicies(policies.filter(p => p.id !== id));
      toast.success('정책이 삭제되었습니다');
    }
  };

  const handleCreate = () => {
    setSelectedPolicy(null);
    setShowForm(true);
  };

  const handleEdit = (policy: CommissionPolicy) => {
    setSelectedPolicy(policy);
    setShowForm(true);
  };

  const toggleBulkSelect = (id: string) => {
    setBulkSelection(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (bulkSelection.length === policies.length) {
      setBulkSelection([]);
    } else {
      setBulkSelection(policies.map(p => p.id));
    }
  };

  // Calculate statistics
  const stats = {
    total: policies.length,
    active: policies.filter(p => p.status === 'active').length,
    avgRate: policies.length > 0
      ? (policies.reduce((sum, p) => sum + p.commissionRate, 0) / policies.length).toFixed(1)
      : 0,
    scheduled: policies.filter(p => p.status === 'scheduled').length
  };

  const headerActions = [
    { id: 'screen-options', label: 'Screen Options', icon: <Settings className="w-4 h-4" />, onClick: () => {}, variant: 'secondary' as const },
    { id: 'refresh', label: '새로고침', icon: <RefreshCw className="w-4 h-4" />, onClick: fetchCommissionPolicies, variant: 'secondary' as const },
    { id: 'add-policy', label: '새로 추가', icon: <Plus className="w-4 h-4" />, onClick: handleCreate, variant: 'primary' as const },
  ];

  const columns: Column<CommissionPolicy>[] = [
    {
      key: 'title',
      title: '정책명',
      dataIndex: 'title',
      render: (value: string, record: CommissionPolicy) => (
        <div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); handleEdit(record); }}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {value}
          </a>
          <div className="text-sm text-gray-500 mt-1">공급자: {record.supplier}</div>
        </div>
      ),
    },
    {
      key: 'partnerGrades',
      title: '적용 등급',
      dataIndex: 'partnerGrades',
      render: (value: string[]) => (
        <span className="text-sm">{getGradeLabels(value)}</span>
      ),
    },
    {
      key: 'commissionRate',
      title: '수수료율',
      dataIndex: 'commissionRate',
      align: 'center' as const,
      render: (value: number) => (
        <strong className="text-lg text-blue-600">{value}%</strong>
      ),
    },
    {
      key: 'minOrderAmount',
      title: '최소 주문금액',
      dataIndex: 'minOrderAmount',
      align: 'right' as const,
      render: (value: number) => value > 0 ? (
        <span>₩{value.toLocaleString()}</span>
      ) : (
        <span className="text-gray-400">제한 없음</span>
      ),
    },
    {
      key: 'period',
      title: '기간',
      render: (_: unknown, record: CommissionPolicy) => (
        <div className="text-sm">
          <div>{new Date(record.startDate).toLocaleDateString('ko-KR')}</div>
          {record.endDate && (
            <div className="text-gray-500">~ {new Date(record.endDate).toLocaleDateString('ko-KR')}</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      title: '상태',
      dataIndex: 'status',
      align: 'center' as const,
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'actions',
      title: '작업',
      align: 'center' as const,
      render: (_: unknown, record: CommissionPolicy) => (
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => handleEdit(record)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            편집
          </button>
          <button
            onClick={() => handleDelete(record.id)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            삭제
          </button>
        </div>
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
        actions={headerActions}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">전체 정책</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Settings className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">활성 정책</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">평균 수수료율</p>
              <p className="text-2xl font-bold">{stats.avgRate}%</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">예약된 정책</p>
              <p className="text-2xl font-bold">{stats.scheduled}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable<CommissionPolicy>
        rowKey="id"
        columns={columns}
        dataSource={policies}
        loading={loading}
      />
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
    endDate: policy?.endDate || ''
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              정책명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-o4o-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              수수료율 (%)
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시작일
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-o4o-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              종료일 (선택)
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-o4o-blue focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-o4o-blue text-white rounded hover:bg-o4o-blue-hover"
          >
            {policy ? '업데이트' : '정책 생성'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Commissions;
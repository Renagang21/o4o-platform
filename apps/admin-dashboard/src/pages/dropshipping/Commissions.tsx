import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, Users, Calendar, TrendingUp, Settings, Award } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
      // Fetch from API - replace with actual endpoint
      const response = await fetch('/api/admin/dropshipping/commission-policies');
      if (response.ok) {
        const data = await response.json();
        setPolicies(data.policies || []);
      } else {
        console.error('Failed to fetch commission policies');
        toast.error('Failed to load commission policies');
      }
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

  if (showForm) {
    return <CommissionPolicyForm policy={selectedPolicy} onClose={() => setShowForm(false)} />;
  }

  return (
    <div className="p-6">
      {/* WordPress Admin Style Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-normal text-gray-900">수수료 정책</h1>
        <button
          onClick={handleCreate}
          className="px-3 py-1 bg-wordpress-blue text-white text-sm rounded hover:bg-wordpress-blue-hover transition"
        >
          새로 추가
        </button>
      </div>

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

      {/* Filter Bar */}
      <div className="bg-white border border-gray-300 rounded-t-lg p-3 flex justify-between items-center">
        <div className="flex gap-2">
          <select className="px-3 py-1 border border-gray-300 rounded text-sm">
            <option value="">일괄 작업</option>
            <option value="delete">삭제</option>
            <option value="deactivate">비활성화</option>
          </select>
          <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
            적용
          </button>
        </div>
        
        <div className="flex gap-2 items-center">
          <select className="px-3 py-1 border border-gray-300 rounded text-sm">
            <option value="">모든 상태</option>
            <option value="active">활성</option>
            <option value="scheduled">예약됨</option>
            <option value="expired">만료됨</option>
          </select>
          <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
            필터
          </button>
        </div>
      </div>

      {/* WordPress Style Table */}
      <div className="bg-white border-x border-b border-gray-300 rounded-b-lg">
        <table className="w-full wp-list-table widefat fixed striped">
          <thead>
            <tr>
              <td className="manage-column check-column">
                <input 
                  type="checkbox" 
                  onChange={toggleSelectAll}
                  checked={bulkSelection.length === policies.length && policies.length > 0}
                />
              </td>
              <th className="manage-column column-title column-primary">
                <span>정책명</span>
              </th>
              <th className="manage-column">적용 등급</th>
              <th className="manage-column">수수료율</th>
              <th className="manage-column">최소 주문금액</th>
              <th className="manage-column">기간</th>
              <th className="manage-column">상태</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.id}>
                <th scope="row" className="check-column">
                  <input 
                    type="checkbox"
                    checked={bulkSelection.includes(policy.id)}
                    onChange={() => toggleBulkSelect(policy.id)}
                  />
                </th>
                <td className="title column-title column-primary page-title">
                  <strong>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); handleEdit(policy); }}
                      className="row-title"
                    >
                      {policy.title}
                    </a>
                  </strong>
                  <div className="text-sm text-gray-500 mt-1">
                    공급자: {policy.supplier}
                  </div>
                  <div className="row-actions">
                    <span className="edit">
                      <a href="#" onClick={(e) => { e.preventDefault(); handleEdit(policy); }}>
                        편집
                      </a>
                    </span>
                    {' | '}
                    <span className="trash">
                      <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); handleDelete(policy.id); }}
                        className="submitdelete"
                      >
                        휴지통
                      </a>
                    </span>
                  </div>
                </td>
                <td>
                  <span className="text-sm">
                    {getGradeLabels(policy.partnerGrades)}
                  </span>
                </td>
                <td>
                  <strong className="text-lg text-wordpress-blue">
                    {policy.commissionRate}%
                  </strong>
                </td>
                <td>
                  {policy.minOrderAmount > 0 ? (
                    <span>₩{policy.minOrderAmount.toLocaleString()}</span>
                  ) : (
                    <span className="text-gray-400">제한 없음</span>
                  )}
                </td>
                <td className="text-sm">
                  <div>{new Date(policy.startDate).toLocaleDateString('ko-KR')}</div>
                  {policy.endDate && (
                    <div className="text-gray-500">
                      ~ {new Date(policy.endDate).toLocaleDateString('ko-KR')}
                    </div>
                  )}
                </td>
                <td>{getStatusBadge(policy.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
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
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
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
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
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
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
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
            className="px-4 py-2 bg-wordpress-blue text-white rounded hover:bg-wordpress-blue-hover"
          >
            {policy ? '업데이트' : '정책 생성'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Commissions;
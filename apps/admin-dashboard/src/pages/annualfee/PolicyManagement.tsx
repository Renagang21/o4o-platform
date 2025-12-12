import { useState, useEffect, FormEvent } from 'react';
import { authClient } from '@o4o/auth-client';

interface FeePolicy {
  id: string;
  name: string;
  year: number;
  baseAmount: number;
  divisionFeeAmount: number;
  branchFeeAmount: number;
  dueDate: string;
  earlyPaymentDate?: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
}

/**
 * PolicyManagement
 *
 * 회비 정책 관리 페이지
 */
export default function PolicyManagement() {
  const [policies, setPolicies] = useState<FeePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<FeePolicy | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear() + 1,
    baseAmount: 0,
    divisionFeeAmount: 0,
    branchFeeAmount: 0,
    dueDate: '03-31',
    earlyPaymentDate: '01-31',
    description: '',
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      const response = await authClient.api.get('/api/annualfee/policies');
      if (response.data?.success) {
        setPolicies(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingPolicy) {
        await authClient.api.put(`/api/annualfee/policies/${editingPolicy.id}`, formData);
      } else {
        await authClient.api.post('/api/annualfee/policies', formData);
      }
      setShowForm(false);
      setEditingPolicy(null);
      resetForm();
      loadPolicies();
    } catch (error) {
      console.error('Failed to save policy:', error);
      alert('정책 저장에 실패했습니다.');
    }
  };

  const handleEdit = (policy: FeePolicy) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      year: policy.year,
      baseAmount: policy.baseAmount,
      divisionFeeAmount: policy.divisionFeeAmount,
      branchFeeAmount: policy.branchFeeAmount,
      dueDate: policy.dueDate,
      earlyPaymentDate: policy.earlyPaymentDate || '',
      description: policy.description || '',
    });
    setShowForm(true);
  };

  const handleToggleActive = async (policy: FeePolicy) => {
    try {
      const endpoint = policy.isActive ? 'deactivate' : 'activate';
      await authClient.api.put(`/api/annualfee/policies/${policy.id}/${endpoint}`);
      loadPolicies();
    } catch (error) {
      console.error('Failed to toggle policy:', error);
    }
  };

  const handleClone = async (year: number) => {
    try {
      await authClient.api.post(`/api/annualfee/policies/${year}/clone`);
      loadPolicies();
    } catch (error) {
      console.error('Failed to clone policy:', error);
      alert('정책 복제에 실패했습니다.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      year: new Date().getFullYear() + 1,
      baseAmount: 0,
      divisionFeeAmount: 0,
      branchFeeAmount: 0,
      dueDate: '03-31',
      earlyPaymentDate: '01-31',
      description: '',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">회비 정책 관리</h1>
        <button
          onClick={() => {
            resetForm();
            setEditingPolicy(null);
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + 새 정책 등록
        </button>
      </div>

      {/* 정책 목록 */}
      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">연도</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">정책명</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">본회비</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">지부비</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">분회비</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">총액</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">납부기한</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">상태</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">관리</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{policy.year}년</td>
                <td className="px-4 py-3">{policy.name}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(policy.baseAmount)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(policy.divisionFeeAmount)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(policy.branchFeeAmount)}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(policy.baseAmount + policy.divisionFeeAmount + policy.branchFeeAmount)}
                </td>
                <td className="px-4 py-3 text-center">{policy.dueDate}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      policy.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {policy.isActive ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleEdit(policy)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleToggleActive(policy)}
                      className="text-gray-600 hover:underline text-sm"
                    >
                      {policy.isActive ? '비활성화' : '활성화'}
                    </button>
                    <button
                      onClick={() => handleClone(policy.year)}
                      className="text-green-600 hover:underline text-sm"
                    >
                      복제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {policies.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  등록된 정책이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 정책 등록/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingPolicy ? '정책 수정' : '새 정책 등록'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      정책명 *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      적용 연도 *
                    </label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      본회비 (원) *
                    </label>
                    <input
                      type="number"
                      value={formData.baseAmount}
                      onChange={(e) => setFormData({ ...formData, baseAmount: parseInt(e.target.value) })}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      지부비 (원)
                    </label>
                    <input
                      type="number"
                      value={formData.divisionFeeAmount}
                      onChange={(e) => setFormData({ ...formData, divisionFeeAmount: parseInt(e.target.value) })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      분회비 (원)
                    </label>
                    <input
                      type="number"
                      value={formData.branchFeeAmount}
                      onChange={(e) => setFormData({ ...formData, branchFeeAmount: parseInt(e.target.value) })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      납부 기한 (MM-DD)
                    </label>
                    <input
                      type="text"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="03-31"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      조기납부 기한 (MM-DD)
                    </label>
                    <input
                      type="text"
                      value={formData.earlyPaymentDate}
                      onChange={(e) => setFormData({ ...formData, earlyPaymentDate: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="01-31"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      설명
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingPolicy(null);
                    }}
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {editingPolicy ? '수정' : '등록'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

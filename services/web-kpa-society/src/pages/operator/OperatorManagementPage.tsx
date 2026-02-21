/**
 * OperatorManagementPage - KPA 서비스 운영자 관리
 *
 * KPA 서비스 관리자(kpa-a:operator, kpa-b:district 등)가
 * 자신의 서비스 운영자를 등록/수정/삭제할 수 있는 페이지
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  Users,
  Shield,
  CheckCircle
} from 'lucide-react';
import { authClient } from '@o4o/auth-client';

// KPA 서비스 역할 정의
// WO-KPA-C-ROLE-SYNC-NORMALIZATION-V1: kpa-c:operator 제거 — 분회 역할은 KpaMember.role이 SSOT
const KPA_ROLES = [
  { value: 'kpa-a:operator', label: '커뮤니티 운영자', description: 'KPA 커뮤니티 서비스 운영자 (kpa-society.co.kr)' },
  { value: 'kpa-b:district', label: '데모서비스 지부 운영자', description: '지부/분회 데모 서비스 지부 운영자 (/demo)' },
  { value: 'kpa-b:branch', label: '데모서비스 분회 운영자', description: '지부/분회 데모 서비스 분회 운영자 (/demo)' },
];

interface Operator {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}

export function OperatorManagementPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    roles: [] as string[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 알림 표시 헬퍼
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // KPA 운영자 목록 조회
  const fetchOperators = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/admin/users', {
        params: { limit: 1000 }
      });

      const userData = response.data?.users || response.data?.data?.users || response.data?.data || response.data || [];

      if (Array.isArray(userData)) {
        // KPA 역할을 가진 사용자만 필터링
        const kpaOperators = userData
          .filter((user: any) => {
            const userRoles = user.roles || [];
            return userRoles.some((role: string) => role?.startsWith('kpa'));
          })
          .map((user: any): Operator => ({
            id: user.id || user._id,
            name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '이름없음',
            email: user.email || '',
            roles: (user.roles || []).filter((r: string) => r?.startsWith('kpa')),
            status: (user.isActive === false ? 'inactive' : 'active') as 'active' | 'inactive',
            createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '',
            lastLogin: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('ko-KR') : undefined,
          }));

        setOperators(kpaOperators);
      }
    } catch (err: any) {
      console.error('Failed to fetch operators:', err);
      showNotification('error', '운영자 목록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperators();
  }, []);

  // 필터링된 운영자 목록
  const filteredOperators = useMemo(() => {
    if (!searchQuery) return operators;
    const query = searchQuery.toLowerCase();
    return operators.filter(op =>
      op.name.toLowerCase().includes(query) ||
      op.email.toLowerCase().includes(query) ||
      op.roles.some(r => r.toLowerCase().includes(query))
    );
  }, [operators, searchQuery]);

  // 역할 표시
  const getRoleLabel = (role: string) => {
    const roleInfo = KPA_ROLES.find(r => r.value === role);
    return roleInfo?.label || role;
  };

  const getRoleColor = (role: string) => {
    if (role.includes('kpa-a')) return 'bg-blue-100 text-blue-800';
    if (role.includes('kpa-b:district')) return 'bg-purple-100 text-purple-800';
    if (role.includes('kpa-b:branch')) return 'bg-indigo-100 text-indigo-800';
    if (role.includes('kpa-c')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  // 모달 핸들러
  const openCreateModal = () => {
    setEditingOperator(null);
    setFormData({ email: '', password: '', name: '', roles: [] });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (operator: Operator) => {
    setEditingOperator(operator);
    setFormData({
      email: operator.email,
      password: '',
      name: operator.name,
      roles: operator.roles,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingOperator(null);
    setFormData({ email: '', password: '', name: '', roles: [] });
    setFormErrors({});
  };

  // 폼 유효성 검사
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = '이메일을 입력하세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '올바른 이메일 형식이 아닙니다';
    }

    if (!editingOperator && !formData.password) {
      errors.password = '비밀번호를 입력하세요';
    } else if (formData.password && formData.password.length < 8) {
      errors.password = '비밀번호는 8자 이상이어야 합니다';
    }

    if (!formData.name) {
      errors.name = '이름을 입력하세요';
    }

    if (formData.roles.length === 0) {
      errors.roles = '최소 1개의 역할을 선택하세요';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 저장 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingOperator) {
        // 수정
        const updateData: any = {
          name: formData.name,
          roles: formData.roles,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }

        await authClient.api.put(`/admin/users/${editingOperator.id}`, updateData);
        showNotification('success', '운영자 정보가 수정되었습니다');
      } else {
        // 등록
        await authClient.api.post('/admin/users', {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          roles: formData.roles,
          role: formData.roles[0]?.split(':')[1] || 'operator',
          isEmailVerified: true,
          isActive: true,
        });
        showNotification('success', '운영자가 등록되었습니다');
      }

      closeModal();
      fetchOperators();
    } catch (err: any) {
      console.error('Failed to save operator:', err);
      const message = err.response?.data?.message || err.response?.data?.error || '저장에 실패했습니다';
      showNotification('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  // 삭제 핸들러
  const handleDelete = async (operator: Operator) => {
    if (!confirm(`"${operator.name}" 운영자를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await authClient.api.delete(`/admin/users/${operator.id}`);
      showNotification('success', '운영자가 삭제되었습니다');
      fetchOperators();
    } catch (err: any) {
      console.error('Failed to delete operator:', err);
      showNotification('error', '삭제에 실패했습니다');
    }
  };

  // 역할 토글
  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* 알림 */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {notification.message}
        </div>
      )}

      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">운영자 관리</h1>
          <p className="text-slate-500 mt-1">KPA 서비스 운영자를 등록하고 관리합니다</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchOperators}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            운영자 등록
          </button>
        </div>
      </div>

      {/* 검색 */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="이름, 이메일, 역할로 검색..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-slate-800">{operators.length}</div>
              <div className="text-sm text-slate-500">전체 운영자</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-600">
                {operators.filter(o => o.status === 'active').length}
              </div>
              <div className="text-sm text-slate-500">활성</div>
            </div>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            로딩 중...
          </div>
        ) : filteredOperators.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            {searchQuery ? '검색 결과가 없습니다' : '등록된 운영자가 없습니다'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">이름</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">역할</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">상태</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">등록일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredOperators.map(operator => (
                <tr key={operator.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-slate-800">{operator.name}</div>
                      <div className="text-sm text-slate-500">{operator.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {operator.roles.map(role => (
                        <span
                          key={role}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(role)}`}
                        >
                          {getRoleLabel(role)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      operator.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {operator.status === 'active' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {operator.status === 'active' ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {operator.createdAt}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(operator)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="수정"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(operator)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 등록/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingOperator ? '운영자 수정' : '운영자 등록'}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* 이메일 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingOperator}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.email ? 'border-red-500' : 'border-slate-300'
                  } ${editingOperator ? 'bg-slate-100' : ''}`}
                  placeholder="operator@example.com"
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* 비밀번호 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  비밀번호 {!editingOperator && <span className="text-red-500">*</span>}
                  {editingOperator && <span className="text-slate-400">(변경 시에만 입력)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.password ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="********"
                />
                {formErrors.password && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.password}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  8자 이상, 대문자, 소문자, 숫자, 특수문자 포함 권장
                </p>
              </div>

              {/* 이름 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.name ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="운영자 이름"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.name}
                  </p>
                )}
              </div>

              {/* 역할 선택 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  역할 <span className="text-red-500">*</span>
                </label>
                {formErrors.roles && (
                  <p className="mb-2 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.roles}
                  </p>
                )}

                <div className="space-y-2">
                  {KPA_ROLES.map(role => (
                    <label
                      key={role.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formData.roles.includes(role.value)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.roles.includes(role.value)}
                        onChange={() => toggleRole(role.value)}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-slate-800">{role.label}</div>
                        <div className="text-sm text-slate-500">{role.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                  disabled={submitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingOperator ? '수정' : '등록'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperatorManagementPage;

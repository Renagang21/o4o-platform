/**
 * Role Management Page — 역할 카탈로그 관리
 * WO-O4O-ROLE-MANAGEMENT-UI-V1
 *
 * Backend API: /api/v1/operator/roles
 * Admin만 CUD 가능, operator는 조회만.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';
import { api } from '../../lib/apiClient';
import { toast } from '@o4o/error-handling';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ───────────────────────────────────────────────────

interface RoleData {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  serviceKey?: string;
  roleKey?: string;
  isAdminRole: boolean;
  isAssignable: boolean;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RoleFormData {
  name: string;
  displayName: string;
  description: string;
  serviceKey: string;
  roleKey: string;
  isAdminRole: boolean;
  isAssignable: boolean;
}

// ─── API Helper ──────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = path.replace(/^\/api\/v1/, '') || '/';
  const method = (options?.method || 'GET').toUpperCase();
  let body: any;
  if (options?.body && typeof options.body === 'string') {
    try { body = JSON.parse(options.body); } catch { body = options.body; }
  }
  const response = await api.request({ method, url, data: body });
  return response.data;
}

// ─── Constants ───────────────────────────────────────────────

const SERVICE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'platform', label: 'Platform' },
  { value: 'neture', label: 'Neture' },
  { value: 'glycopharm', label: 'GlycoPharm' },
  { value: 'glucoseview', label: 'GlucoseView' },
  { value: 'kpa', label: 'KPA' },
  { value: 'cosmetics', label: 'K-Cosmetics' },
  { value: 'lms', label: 'LMS' },
];

const EMPTY_FORM: RoleFormData = {
  name: '',
  displayName: '',
  description: '',
  serviceKey: '',
  roleKey: '',
  isAdminRole: false,
  isAssignable: true,
};

// ─── Component ───────────────────────────────────────────────

export default function RoleManagementPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.some((r: string) => ['admin', 'super_admin'].includes(r)) ?? false;

  const [roles, setRoles] = useState<RoleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [form, setForm] = useState<RoleFormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = serviceFilter ? `?service=${serviceFilter}` : '';
      const data = await apiFetch<{ success: boolean; data: RoleData[] }>(
        `/api/v1/operator/roles${qs}`,
      );
      if (data.success) {
        setRoles(data.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to fetch roles');
    } finally {
      setIsLoading(false);
    }
  }, [serviceFilter]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // ─── Filtered list ───────────────────────────────────────

  const filteredRoles = searchTerm
    ? roles.filter(
        (r) =>
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.description || '').toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : roles;

  // ─── Modal helpers ───────────────────────────────────────

  const openCreateModal = () => {
    setEditingRole(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (role: RoleData) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description || '',
      serviceKey: role.serviceKey || '',
      roleKey: role.roleKey || '',
      isAdminRole: role.isAdminRole,
      isAssignable: role.isAssignable,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setForm(EMPTY_FORM);
  };

  // ─── CRUD ────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name || !form.displayName || !form.serviceKey || !form.roleKey) {
      toast.error('name, displayName, serviceKey, roleKey는 필수입니다.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingRole) {
        await apiFetch(`/api/v1/operator/roles/${editingRole.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            displayName: form.displayName,
            description: form.description || undefined,
            isAdminRole: form.isAdminRole,
            isAssignable: form.isAssignable,
          }),
        });
        toast.success('역할이 수정되었습니다.');
      } else {
        await apiFetch(`/api/v1/operator/roles`, {
          method: 'POST',
          body: JSON.stringify({
            name: form.name,
            displayName: form.displayName,
            description: form.description || undefined,
            serviceKey: form.serviceKey,
            roleKey: form.roleKey,
            isAdminRole: form.isAdminRole,
            isAssignable: form.isAssignable,
          }),
        });
        toast.success('역할이 생성되었습니다.');
      }
      closeModal();
      fetchRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || '저장 실패');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (role: RoleData) => {
    if (role.isSystem) {
      toast.error('시스템 역할은 삭제할 수 없습니다.');
      return;
    }
    if (!confirm(`"${role.displayName}" 역할을 비활성화하시겠습니까?`)) return;
    try {
      await apiFetch(`/api/v1/operator/roles/${role.id}`, { method: 'DELETE' });
      toast.success('역할이 비활성화되었습니다.');
      fetchRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || '삭제 실패');
    }
  };

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">역할 관리</h1>
          <span className="text-sm text-gray-500">({filteredRoles.length}개)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRoles}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={14} />
            새로고침
          </button>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus size={14} />
              새 역할 추가
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {SERVICE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="이름, 표시명, 설명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        /* Table */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Display Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Service</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Badges</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Description</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-gray-400">
                      역할이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-800">{role.name}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{role.displayName}</td>
                      <td className="px-4 py-3 text-gray-600">{role.serviceKey || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-1 flex-wrap">
                          {role.isSystem && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 font-medium">
                              SYSTEM
                            </span>
                          )}
                          {role.isAdminRole && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-red-50 text-red-600 font-medium">
                              ADMIN
                            </span>
                          )}
                          {role.isAssignable && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-600 font-medium">
                              ASSIGNABLE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                        {role.description || '-'}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => openEditModal(role)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                              title="수정"
                            >
                              <Pencil size={14} />
                            </button>
                            {!role.isSystem && (
                              <button
                                onClick={() => handleDelete(role)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                                title="비활성화"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingRole ? '역할 수정' : '새 역할 추가'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={!!editingRole}
                  placeholder="예: kpa:pharmacist"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="예: KPA 약사"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.serviceKey}
                    onChange={(e) => setForm({ ...form, serviceKey: e.target.value })}
                    disabled={!!editingRole}
                    placeholder="예: kpa"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.roleKey}
                    onChange={(e) => setForm({ ...form, roleKey: e.target.value })}
                    disabled={!!editingRole}
                    placeholder="예: pharmacist"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isAdminRole}
                    onChange={(e) => setForm({ ...form, isAdminRole: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Admin Role</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isAssignable}
                    onChange={(e) => setForm({ ...form, isAssignable: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Assignable</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editingRole ? '수정' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

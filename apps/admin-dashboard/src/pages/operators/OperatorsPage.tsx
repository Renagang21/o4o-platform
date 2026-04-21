/**
 * Operators Management Page
 *
 * Manages service operators with prefixed roles (kpa:operator, neture:admin, etc.)
 * Only accessible by platform:super_admin or admin roles.
 *
 * WO-O4O-TABLE-DATATABLE-DEPRECATION-V1 — BaseTable 직접 사용으로 마이그레이션
 * - DataTable wrapper 제거 → BaseTable + O4OColumn
 * - 인라인 아이콘 버튼 → RowActionMenu
 * - 검색 → FilterBar
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Shield, Users, X, Check, AlertCircle } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { BaseTable, RowActionMenu, FilterBar } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import PageHeader from '@/components/common/PageHeader';

// WO-OPERATOR-ROLE-CLEANUP-V1: Super Admin = 전체 접근, 각 서비스 = Admin + Operator만
// WO-O4O-KPA-CODE-CLEANUP-V1: kpa-b/kpa-c 제거
const SERVICE_ROLES = {
  platform: [
    { value: 'platform:super_admin', label: 'Super Admin', description: '모든 서비스 접근 가능' },
  ],
  kpa: [
    { value: 'kpa:admin', label: 'Admin', description: 'KPA 커뮤니티 관리자' },
    { value: 'kpa:operator', label: 'Operator', description: 'KPA 커뮤니티 운영자' },
  ],
  neture: [
    { value: 'neture:admin', label: 'Admin', description: 'Neture 관리자' },
    { value: 'neture:operator', label: 'Operator', description: 'Neture 운영자' },
  ],
  glycopharm: [
    { value: 'glycopharm:admin', label: 'Admin', description: 'GlycoPharm 관리자' },
    { value: 'glycopharm:operator', label: 'Operator', description: 'GlycoPharm 운영자' },
  ],
  cosmetics: [
    { value: 'cosmetics:admin', label: 'Admin', description: 'K-Cosmetics 관리자' },
    { value: 'cosmetics:operator', label: 'Operator', description: 'K-Cosmetics 운영자' },
  ],
  glucoseview: [
    { value: 'glucoseview:admin', label: 'Admin', description: 'GlucoseView 관리자' },
    { value: 'glucoseview:operator', label: 'Operator', description: 'GlucoseView 운영자' },
  ],
};

const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  platform: 'Platform', kpa: 'KPA', neture: 'Neture',
  glycopharm: 'GlycoPharm', cosmetics: 'K-Cosmetics', glucoseview: 'GlucoseView',
};

const ALL_ROLES = Object.values(SERVICE_ROLES).flat();

interface Operator {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}

type ServiceFilter = 'all' | keyof typeof SERVICE_ROLES;

export default function OperatorsPage() {
  const navigate = useNavigate();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '', lastName: '', firstName: '', roles: [] as string[] });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchOperators = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/admin/users', { params: { limit: 1000 } });
      const raw = response.data?.users || response.data?.data?.users || response.data?.data || response.data || [];
      if (Array.isArray(raw)) {
        const KEYWORDS = ['admin', 'operator', 'super_admin', 'district', 'branch', 'supplier', 'partner'];
        const isOp = (role: string) => KEYWORDS.some((kw) => role.toLowerCase().includes(kw));
        setOperators(
          raw
            .map((u: any) => ({
              id: u.id || u._id,
              name: u.name || `${u.lastName || ''} ${u.firstName || ''}`.trim() || 'Unknown',
              firstName: u.firstName || '',
              lastName: u.lastName || '',
              email: u.email || '',
              roles: u.roles || [u.role].filter(Boolean),
              status: (u.isActive === false ? 'inactive' : 'active') as 'active' | 'inactive',
              createdAt: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '',
              lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString().split('T')[0] : undefined,
            }))
            .filter((u: any) => u.roles.some((r: string) => isOp(r))),
        );
      }
    } catch { toast.error('Failed to load operators'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOperators(); }, []);

  const filteredOperators = useMemo(() => operators.filter((op) => {
    if (serviceFilter !== 'all') {
      const prefix = serviceFilter === 'kpa' ? 'kpa:' : `${serviceFilter}:`;
      if (!op.roles.some((r) => r.toLowerCase().startsWith(prefix))) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return op.name.toLowerCase().includes(q) || op.email.toLowerCase().includes(q) || op.roles.some((r) => r.toLowerCase().includes(q));
    }
    return true;
  }), [operators, serviceFilter, search]);

  const getServiceName = (role: string) => {
    if (role.startsWith('platform:')) return 'Platform';
    if (role.startsWith('kpa:')) return 'KPA';
    if (role.startsWith('neture:')) return 'Neture';
    if (role.startsWith('glycopharm:')) return 'GlycoPharm';
    if (role.startsWith('cosmetics:')) return 'K-Cosmetics';
    if (role.startsWith('glucoseview:')) return 'GlucoseView';
    return '';
  };

  const getRoleDisplay = (role: string) => {
    const info = ALL_ROLES.find((r) => r.value === role);
    const svc = getServiceName(role);
    if (info) return (info.label.includes(svc) || !svc) ? info.label : `${svc}: ${info.label}`;
    const [svcPart, rolePart] = role.split(':');
    return `${svc || svcPart?.toUpperCase() || role}: ${rolePart?.replace(/_/g, ' ') || ''}`;
  };

  const getRoleColor = (role: string) => {
    if (role.startsWith('platform:')) return 'bg-red-100 text-red-800';
    if (role.startsWith('kpa')) return 'bg-blue-100 text-blue-800';
    if (role.startsWith('neture:')) return 'bg-orange-100 text-orange-800';
    if (role.startsWith('glycopharm:')) return 'bg-green-100 text-green-800';
    if (role.startsWith('cosmetics:')) return 'bg-pink-100 text-pink-800';
    if (role.startsWith('glucoseview:')) return 'bg-purple-100 text-purple-800';
    if (role.includes('super_admin')) return 'bg-red-100 text-red-800';
    if (role.includes('admin')) return 'bg-orange-100 text-orange-800';
    if (role.includes('operator')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const openCreateModal = () => {
    setEditingOperator(null);
    setFormData({ email: '', password: '', lastName: '', firstName: '', roles: [] });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (op: Operator) => {
    setEditingOperator(op);
    setFormData({ email: op.email, password: '', lastName: op.lastName, firstName: op.firstName, roles: op.roles });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingOperator(null);
    setFormData({ email: '', password: '', lastName: '', firstName: '', roles: [] });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.email) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';
    if (!editingOperator && !formData.password) errors.password = 'Password is required for new operator';
    else if (formData.password && formData.password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (!formData.lastName) errors.lastName = 'Last name is required';
    if (!formData.firstName) errors.firstName = 'First name is required';
    if (formData.roles.length === 0) errors.roles = 'At least one role is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      if (editingOperator) {
        const data: any = { firstName: formData.firstName, lastName: formData.lastName, name: `${formData.lastName} ${formData.firstName}`.trim(), roles: formData.roles };
        if (formData.password) data.password = formData.password;
        await authClient.api.put(`/admin/users/${editingOperator.id}`, data);
        toast.success('Operator updated successfully');
      } else {
        await authClient.api.post('/admin/users', {
          email: formData.email, password: formData.password,
          firstName: formData.firstName, lastName: formData.lastName,
          name: `${formData.lastName} ${formData.firstName}`.trim(),
          roles: formData.roles, role: formData.roles[0]?.split(':')[1] || 'operator',
          isEmailVerified: true, isActive: true,
        });
        toast.success('Operator created successfully');
      }
      closeModal();
      fetchOperators();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to save operator');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (op: Operator) => {
    if (!confirm(`Are you sure you want to delete operator "${op.name}" (${op.email})?`)) return;
    try {
      await authClient.api.delete(`/admin/users/${op.id}`);
      toast.success('Operator deleted successfully');
      fetchOperators();
    } catch { toast.error('Failed to delete operator'); }
  };

  const toggleRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role) ? prev.roles.filter((r) => r !== role) : [...prev.roles, role],
    }));
  };

  const SERVICE_TABS: { id: ServiceFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'platform', label: 'Platform' },
    { id: 'kpa', label: 'KPA' },
    { id: 'neture', label: 'Neture' },
    { id: 'glycopharm', label: 'GlycoPharm' },
    { id: 'cosmetics', label: 'K-Cosmetics' },
    { id: 'glucoseview', label: 'GlucoseView' },
  ];

  // ── O4O 표준 컬럼 정의 ─────────────────────────────
  const columns: O4OColumn<Operator>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      sortAccessor: (row) => row.name,
      render: (_, row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.name}</div>
          <div className="text-xs text-gray-500">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.map((role) => (
            <span key={role} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(role)}`}>
              {getRoleDisplay(role)}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 100,
      align: 'center',
      sortable: true,
      sortAccessor: (row) => row.status,
      render: (_, row) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
          row.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}>
          {row.status === 'active' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {row.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      width: 110,
      sortable: true,
      sortAccessor: (row) => row.createdAt,
      render: (_, row) => <span className="text-sm text-gray-500">{row.createdAt}</span>,
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
            { key: 'edit', label: '편집', variant: 'primary', onClick: () => openEditModal(row) },
            { key: 'delete', label: '삭제', variant: 'danger', confirm: `"${row.name}" 를 삭제하시겠습니까?`, onClick: () => handleDelete(row) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <PageHeader
        title="Operators Management"
        subtitle="Manage service administrators and operators"
        backUrl="/"
        backLabel="Dashboard"
        actions={[
          { id: 'add', label: 'Add Operator', onClick: openCreateModal, variant: 'primary', icon: <Plus className="w-4 h-4" /> },
          { id: 'refresh', label: 'Refresh', onClick: fetchOperators, variant: 'secondary', icon: <RefreshCw className="w-4 h-4" /> },
        ]}
      />

      {/* Service Tabs */}
      <div className="flex border-b border-gray-200 mb-4 gap-4 overflow-x-auto">
        {SERVICE_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setServiceFilter(tab.id)}
            className={`flex items-center gap-1.5 pb-3 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
              serviceFilter === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Total', count: operators.length, color: 'text-gray-900', Icon: Users },
          { label: 'Active', count: operators.filter((o) => o.status === 'active').length, color: 'text-green-600', Icon: Check },
          { label: 'Admins', count: operators.filter((o) => o.roles.some((r) => r.includes('admin'))).length, color: 'text-orange-600', Icon: Shield },
          { label: 'Operators', count: operators.filter((o) => o.roles.some((r) => r.includes('operator') && !r.includes('admin'))).length, color: 'text-blue-600', Icon: Shield },
        ].map(({ label, count, color, Icon }) => (
          <div key={label} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className={`text-2xl font-bold ${color}`}>{count}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* FilterBar */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <FilterBar
          searchPlaceholder="이름, 이메일, 역할 검색..."
          searchValue={search}
          onSearchChange={setSearch}
        />
      </div>

      {/* BaseTable */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <BaseTable<Operator>
          columns={columns}
          data={filteredOperators}
          rowKey={(row) => row.id}
          tableId="operators-list"
          reorderable
          persistState
          columnVisibility
          emptyMessage="조건에 맞는 운영자가 없습니다."
        />
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editingOperator ? 'Edit Operator' : 'Add New Operator'}</h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingOperator}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.email ? 'border-red-500' : 'border-gray-300'} ${editingOperator ? 'bg-gray-100' : ''}`}
                  placeholder="operator@example.com"
                />
                {formErrors.email && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{formErrors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {!editingOperator && <span className="text-red-500">*</span>}
                  {editingOperator && <span className="text-gray-400 text-xs ml-1">(leave empty to keep current)</span>}
                </label>
                <input
                  type="password" value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.password ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="••••••••"
                />
                {formErrors.password && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{formErrors.password}</p>}
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                {(['lastName', 'firstName'] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field === 'lastName' ? '성 (Last Name)' : '이름 (First Name)'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" value={formData[field]}
                      onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors[field] ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder={field === 'lastName' ? '홍' : '길동'}
                    />
                    {formErrors[field] && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{formErrors[field]}</p>}
                  </div>
                ))}
              </div>

              {/* Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Roles <span className="text-red-500">*</span></label>
                {formErrors.roles && <p className="mb-2 text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{formErrors.roles}</p>}
                <div className="space-y-4 max-h-80 overflow-y-auto border rounded-lg p-3">
                  {Object.entries(SERVICE_ROLES).map(([service, roles]) => (
                    <div key={service} className="border-b pb-3 last:border-0 last:pb-0">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 uppercase">{SERVICE_DISPLAY_NAMES[service] || service}</h4>
                      {roles.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">분회서비스 역할은 조직 멤버십(KpaMember.role)으로 관리됩니다</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {roles.map((role) => (
                            <label key={role.value} className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                              formData.roles.includes(role.value) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                            }`}>
                              <input type="checkbox" checked={formData.roles.includes(role.value)} onChange={() => toggleRole(role.value)} className="mt-0.5 rounded border-gray-300 text-blue-600" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{role.label}</div>
                                <div className="text-xs text-gray-500">{role.description}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={closeModal} disabled={submitting} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" />Saving...</> : <><Check className="w-4 h-4" />{editingOperator ? 'Update Operator' : 'Create Operator'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Operators Management Page
 *
 * Manages service operators with prefixed roles (kpa:operator, neture:admin, etc.)
 * Only accessible by platform:super_admin or admin roles.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Shield,
  Users,
  RefreshCw,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { Column } from '@/components/common/DataTable';

// Service role definitions
const SERVICE_ROLES = {
  platform: [
    { value: 'platform:super_admin', label: 'Platform Super Admin', description: 'Highest privilege, cross-service access' },
    { value: 'platform:admin', label: 'Platform Admin', description: 'Platform administrator' },
    { value: 'platform:operator', label: 'Platform 서비스운영자', description: 'Platform-wide service operator' },
  ],
  // WO-KPA-C-ROLE-SYNC-NORMALIZATION-V1: kpa-c:operator 제거 — 분회 역할은 KpaMember.role이 SSOT
  kpa: [
    { value: 'kpa-a:operator', label: 'KPA 서비스운영자', description: 'KPA 커뮤니티 서비스운영자 (kpa-society.co.kr)' },
    { value: 'kpa-b:district', label: '데모서비스 지부 서비스운영자', description: '지부/분회 데모 서비스 지부 서비스운영자 (/demo)' },
    { value: 'kpa-b:branch', label: '데모서비스 분회 서비스운영자', description: '지부/분회 데모 서비스 분회 서비스운영자 (/demo)' },
  ],
  neture: [
    { value: 'neture:admin', label: 'Neture Admin', description: 'Neture administrator' },
    { value: 'neture:supplier', label: 'Neture Supplier', description: 'Neture supplier' },
    { value: 'neture:partner', label: 'Neture Partner', description: 'Neture partner' },
  ],
  glycopharm: [
    { value: 'glycopharm:admin', label: 'GlycoPharm Admin', description: 'GlycoPharm administrator' },
    { value: 'glycopharm:operator', label: 'GlycoPharm 서비스운영자', description: 'GlycoPharm 서비스운영자' },
  ],
  cosmetics: [
    { value: 'cosmetics:admin', label: 'K-Cosmetics Admin', description: 'K-Cosmetics administrator' },
    { value: 'cosmetics:operator', label: 'K-Cosmetics 서비스운영자', description: 'K-Cosmetics 서비스운영자' },
  ],
  glucoseview: [
    { value: 'glucoseview:admin', label: 'GlucoseView Admin', description: 'GlucoseView administrator' },
    { value: 'glucoseview:operator', label: 'GlucoseView 서비스운영자', description: 'GlucoseView 서비스운영자' },
  ],
};

const ALL_ROLES = Object.values(SERVICE_ROLES).flat();

interface Operator {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}

type ServiceFilter = 'all' | keyof typeof SERVICE_ROLES;

const OperatorsPage: React.FC = () => {
  const navigate = useNavigate();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    lastName: '',
    firstName: '',
    roles: [] as string[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch operators
  const fetchOperators = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/admin/users', {
        params: { limit: 1000 }
      });

      const userData = response.data?.users || response.data?.data?.users || response.data?.data || response.data || [];

      if (Array.isArray(userData)) {
        const OPERATOR_ROLE_KEYWORDS = ['admin', 'operator', 'super_admin', 'district', 'branch'];
        const isOperatorRole = (role: string) =>
          OPERATOR_ROLE_KEYWORDS.some(kw => role.toLowerCase().includes(kw));

        const operatorUsers = userData
          .map((user: any) => ({
            id: user.id || user._id,
            name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
            email: user.email || '',
            roles: user.roles || [user.role].filter(Boolean),
            status: (user.isActive === false ? 'inactive' : 'active') as 'active' | 'inactive',
            createdAt: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : '',
            lastLogin: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString().split('T')[0] : undefined,
          }))
          .filter((user: any) => user.roles.some((r: string) => isOperatorRole(r)));

        setOperators(operatorUsers);
      }
    } catch (err: any) {
      console.error('Failed to fetch operators:', err);
      toast.error('Failed to load operators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperators();
  }, []);

  // Filter operators
  const filteredOperators = useMemo(() => {
    return operators.filter(op => {
      // Service filter - 서비스 프리픽스로만 필터링 (깔끔하게)
      if (serviceFilter !== 'all') {
        const hasServiceRole = op.roles.some(role => {
          const roleLower = role.toLowerCase();
          if (serviceFilter === 'platform') {
            return roleLower.startsWith('platform:');
          }
          if (serviceFilter === 'kpa') {
            return roleLower.startsWith('kpa-') || roleLower.startsWith('kpa:');
          }
          return roleLower.startsWith(`${serviceFilter}:`);
        });
        if (!hasServiceRole) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          op.name.toLowerCase().includes(query) ||
          op.email.toLowerCase().includes(query) ||
          op.roles.some(r => r.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [operators, serviceFilter, searchQuery]);

  // Service name mapping
  const getServiceName = (role: string): string => {
    if (role.startsWith('platform:')) return 'Platform';
    if (role.startsWith('kpa-a:')) return 'KPA 커뮤니티';
    if (role.startsWith('kpa-b:')) return 'KPA 데모';
    if (role.startsWith('kpa-c:')) return 'KPA 분회서비스';
    if (role.startsWith('kpa:')) return 'KPA';
    if (role.startsWith('neture:')) return 'Neture';
    if (role.startsWith('glycopharm:')) return 'GlycoPharm';
    if (role.startsWith('cosmetics:')) return 'K-Cosmetics';
    if (role.startsWith('glucoseview:')) return 'GlucoseView';
    return '';
  };

  // Role display helper - shows service name + role label
  const getRoleDisplay = (role: string) => {
    const roleInfo = ALL_ROLES.find(r => r.value === role);
    const serviceName = getServiceName(role);

    if (roleInfo) {
      // 서비스명이 라벨에 이미 포함되어 있으면 그대로 사용
      if (roleInfo.label.includes(serviceName) || !serviceName) {
        return roleInfo.label;
      }
      return `${serviceName}: ${roleInfo.label}`;
    }

    // Parse role format for unknown roles
    const [service, roleName] = role.split(':');
    const displayService = serviceName || service.toUpperCase();
    return `${displayService}: ${roleName?.replace(/_/g, ' ') || role}`;
  };

  const getRoleColor = (role: string) => {
    // Service-based colors
    if (role.startsWith('platform:')) return 'bg-red-100 text-red-800';
    if (role.startsWith('kpa')) return 'bg-blue-100 text-blue-800';
    if (role.startsWith('neture:')) return 'bg-orange-100 text-orange-800';
    if (role.startsWith('glycopharm:')) return 'bg-green-100 text-green-800';
    if (role.startsWith('cosmetics:')) return 'bg-pink-100 text-pink-800';
    if (role.startsWith('glucoseview:')) return 'bg-purple-100 text-purple-800';

    // Role-based fallback
    if (role.includes('super_admin')) return 'bg-red-100 text-red-800';
    if (role.includes('admin')) return 'bg-orange-100 text-orange-800';
    if (role.includes('operator')) return 'bg-blue-100 text-blue-800';
    if (role.includes('supplier')) return 'bg-green-100 text-green-800';
    if (role.includes('partner')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Modal handlers
  const openCreateModal = () => {
    setEditingOperator(null);
    setFormData({ email: '', password: '', lastName: '', firstName: '', roles: [] });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (operator: Operator) => {
    setEditingOperator(operator);
    // name에서 성/이름 분리 (첫 글자 = 성, 나머지 = 이름)
    const nameParts = operator.name.trim();
    const lastName = nameParts.length > 0 ? nameParts.charAt(0) : '';
    const firstName = nameParts.length > 1 ? nameParts.slice(1) : '';
    setFormData({
      email: operator.email,
      password: '',
      lastName,
      firstName,
      roles: operator.roles,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingOperator(null);
    setFormData({ email: '', password: '', lastName: '', firstName: '', roles: [] });
    setFormErrors({});
  };

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!editingOperator && !formData.password) {
      errors.password = 'Password is required for new operator';
    } else if (formData.password && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!formData.lastName) {
      errors.lastName = 'Last name is required';
    }
    if (!formData.firstName) {
      errors.firstName = 'First name is required';
    }

    if (formData.roles.length === 0) {
      errors.roles = 'At least one role is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingOperator) {
        // Update existing operator
        const updateData: any = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          name: `${formData.lastName}${formData.firstName}`,
          roles: formData.roles,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }

        await authClient.api.put(`/admin/users/${editingOperator.id}`, updateData);
        toast.success('Operator updated successfully');
      } else {
        // Create new operator
        await authClient.api.post('/admin/users', {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          name: `${formData.lastName}${formData.firstName}`,
          roles: formData.roles,
          role: formData.roles[0]?.split(':')[1] || 'operator', // Legacy role field
          isEmailVerified: true,
          isActive: true,
        });
        toast.success('Operator created successfully');
      }

      closeModal();
      fetchOperators();
    } catch (err: any) {
      console.error('Failed to save operator:', err);
      const message = err.response?.data?.message || err.response?.data?.error || 'Failed to save operator';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete handler
  const handleDelete = async (operator: Operator) => {
    if (!confirm(`Are you sure you want to delete operator "${operator.name}" (${operator.email})?`)) {
      return;
    }

    try {
      await authClient.api.delete(`/admin/users/${operator.id}`);
      toast.success('Operator deleted successfully');
      fetchOperators();
    } catch (err: any) {
      console.error('Failed to delete operator:', err);
      toast.error('Failed to delete operator');
    }
  };

  // Toggle role selection
  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  // Columns
  const columns: Column<Operator>[] = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      dataIndex: 'name',
      render: (_, record) => (
        <div>
          <div className="font-medium text-gray-900">{record.name}</div>
          <div className="text-sm text-gray-500">{record.email}</div>
        </div>
      ),
    },
    {
      key: 'roles',
      title: 'Roles',
      sortable: true,
      dataIndex: 'roles',
      sorter: (a, b) => (a.roles[0] || '').localeCompare(b.roles[0] || ''),
      render: (_, record) => (
        <div className="flex flex-wrap gap-1">
          {record.roles.map(role => (
            <span
              key={role}
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(role)}`}
            >
              {getRoleDisplay(role)}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      dataIndex: 'status',
      render: (val) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
          val === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}>
          {val === 'active' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {val === 'active' ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created',
      sortable: true,
      dataIndex: 'createdAt',
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(record)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(record)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const serviceTabs = [
    { id: 'all' as ServiceFilter, label: 'All', icon: Users },
    { id: 'platform' as ServiceFilter, label: 'Platform', icon: Shield },
    { id: 'kpa' as ServiceFilter, label: 'KPA Society', icon: Shield },
    { id: 'neture' as ServiceFilter, label: 'Neture', icon: Shield },
    { id: 'glycopharm' as ServiceFilter, label: 'GlycoPharm', icon: Shield },
    { id: 'cosmetics' as ServiceFilter, label: 'K-Cosmetics', icon: Shield },
    { id: 'glucoseview' as ServiceFilter, label: 'GlucoseView', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <PageHeader
        title="서비스운영자 관리"
        subtitle="서비스운영자 및 관리자를 관리합니다"
        backUrl="/"
        backLabel="Dashboard"
        showSearch
        onSearch={setSearchQuery}
        actions={[
          {
            id: 'add',
            label: '서비스운영자 추가',
            onClick: openCreateModal,
            variant: 'primary',
            icon: <Plus className="w-4 h-4" />
          },
          {
            id: 'refresh',
            label: 'Refresh',
            onClick: fetchOperators,
            variant: 'secondary',
            icon: <RefreshCw className="w-4 h-4" />
          }
        ]}
      />

      {/* Service Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-4 overflow-x-auto">
        {serviceTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setServiceFilter(tab.id)}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
              serviceFilter === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{operators.length}</div>
          <div className="text-sm text-gray-500">전체 서비스운영자</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {operators.filter(o => o.status === 'active').length}
          </div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-orange-600">
            {operators.filter(o => o.roles.some(r => r.includes('admin'))).length}
          </div>
          <div className="text-sm text-gray-500">Admins</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">
            {operators.filter(o => o.roles.some(r => r.includes('operator') && !r.includes('admin'))).length}
          </div>
          <div className="text-sm text-gray-500">서비스운영자</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <DataTable
          columns={columns}
          dataSource={filteredOperators}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            total: filteredOperators.length,
          }}
        />
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingOperator ? '서비스운영자 수정' : '서비스운영자 추가'}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingOperator}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  } ${editingOperator ? 'bg-gray-100' : ''}`}
                  placeholder="operator@example.com"
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {!editingOperator && <span className="text-red-500">*</span>}
                  {editingOperator && <span className="text-gray-400">(leave empty to keep current)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                />
                {formErrors.password && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.password}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Must contain: 8+ chars, uppercase, lowercase, number, special character
                </p>
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    성 (Last Name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="홍"
                  />
                  {formErrors.lastName && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {formErrors.lastName}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이름 (First Name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="길동"
                  />
                  {formErrors.firstName && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {formErrors.firstName}
                    </p>
                  )}
                </div>
              </div>

              {/* Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roles <span className="text-red-500">*</span>
                </label>
                {formErrors.roles && (
                  <p className="mb-2 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.roles}
                  </p>
                )}

                <div className="space-y-4 max-h-80 overflow-y-auto border rounded-lg p-3">
                  {Object.entries(SERVICE_ROLES).map(([service, roles]) => (
                    <div key={service} className="border-b pb-3 last:border-0 last:pb-0">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 uppercase">
                        {service === 'kpa' ? 'KPA Society' : service.charAt(0).toUpperCase() + service.slice(1)}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {roles.map(role => (
                          <label
                            key={role.value}
                            className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                              formData.roles.includes(role.value)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.roles.includes(role.value)}
                              onChange={() => toggleRole(role.value)}
                              className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{role.label}</div>
                              <div className="text-xs text-gray-500">{role.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingOperator ? 'Update Operator' : 'Create Operator'}
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
};

export default OperatorsPage;

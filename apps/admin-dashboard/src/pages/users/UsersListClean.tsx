/**
 * UsersListClean
 *
 * WO-O4O-TABLE-DATATABLE-DEPRECATION-V1 — BaseTable 직접 사용으로 마이그레이션
 *
 * 변경사항:
 * - DataTable wrapper 제거 → BaseTable + O4OColumn 직접 사용
 * - Screen Options 커스텀 패널 제거 → BaseTable columnVisibility(+persistState) 대체
 * - rowSelection: string[] → Set<string>
 * - expandable → renderAfterRow
 * - Actions → RowActionMenu
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { BaseTable, RowActionMenu, FilterBar } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import PageHeader from '@/components/common/PageHeader';

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  posts: number;
  registeredDate: string;
  lastLogin?: string;
  status: 'active' | 'inactive' | 'pending';
  avatar?: string;
}

type TabStatus = 'all' | 'super_admin' | 'admin' | 'seller' | 'partner' | 'supplier' | 'customer';

const ROLE_MAP: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'text-red-700 bg-red-50' },
  admin: { label: 'Admin', color: 'text-red-600 bg-red-50' },
  seller: { label: 'Seller', color: 'text-green-600 bg-green-50' },
  partner: { label: 'Partner', color: 'text-orange-600 bg-orange-50' },
  supplier: { label: 'Supplier', color: 'text-purple-600 bg-purple-50' },
  customer: { label: 'Customer', color: 'text-gray-600 bg-gray-50' },
};

const TABS: { id: TabStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'super_admin', label: 'Super Admin' },
  { id: 'admin', label: 'Admin' },
  { id: 'seller', label: 'Seller' },
  { id: 'partner', label: 'Partner' },
  { id: 'supplier', label: 'Supplier' },
  { id: 'customer', label: 'Customer' },
];

export default function UsersListClean() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabStatus>(() => (sessionStorage.getItem('users-active-tab') as TabStatus) || 'all');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quickEdit, setQuickEdit] = useState({ id: '', name: '', email: '', role: 'customer', username: '' });

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { sessionStorage.setItem('users-active-tab', activeTab); }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/admin/users', { params: { limit: 1000, page: 1 } });
      const raw = response.data?.users || response.data?.data?.users || response.data?.data || response.data || [];
      if (Array.isArray(raw)) {
        setUsers(raw.map((u: any) => ({
          id: u.id || u._id,
          name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown',
          username: u.username || u.email?.split('@')[0] || 'unknown',
          email: u.email || '',
          role: u.role || 'customer',
          posts: u.postsCount || 0,
          registeredDate: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '',
          lastLogin: u.lastLogin || u.lastLoginAt ? new Date(u.lastLogin || u.lastLoginAt).toISOString().split('T')[0] : undefined,
          status: u.status || 'active',
          avatar: u.avatar,
        })));
      }
    } catch {
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => users.filter((u) => {
    if (activeTab !== 'all' && u.role !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  }), [users, activeTab, search]);

  const handleBulkAction = async () => {
    if (!bulkAction || selectedKeys.size === 0) { toast.error('Please select an action and users'); return; }
    const ids = Array.from(selectedKeys);
    if (bulkAction === 'delete') {
      if (!confirm(`Are you sure you want to delete ${ids.length} users?`)) return;
      try {
        await Promise.all(ids.map((id) => authClient.api.delete(`/users/${id}`)));
        setUsers((prev) => prev.filter((u) => !selectedKeys.has(u.id)));
        setSelectedKeys(new Set());
        toast.success('Users deleted successfully');
      } catch { toast.error('Failed to delete users'); }
    } else if (bulkAction === 'change-role') {
      const newRole = prompt('Enter new role (super_admin, admin, seller, partner, supplier, customer):');
      if (!newRole) return;
      try {
        await Promise.all(ids.map((id) => authClient.api.patch(`/users/${id}`, { role: newRole })));
        setUsers((prev) => prev.map((u) => selectedKeys.has(u.id) ? { ...u, role: newRole } : u));
        setSelectedKeys(new Set());
        toast.success('Roles updated successfully');
      } catch { toast.error('Failed to update roles'); }
    }
  };

  const openQuickEdit = (user: User) => {
    if (expandedId === user.id) { setExpandedId(null); return; }
    setQuickEdit({ id: user.id, name: user.name, email: user.email, role: user.role, username: user.username });
    setExpandedId(user.id);
  };

  const handleQuickEditSave = async () => {
    try {
      await authClient.api.patch(`/users/${quickEdit.id}`, quickEdit);
      setUsers((prev) => prev.map((u) => u.id === quickEdit.id ? { ...u, ...quickEdit } : u));
      setExpandedId(null);
      toast.success('User updated successfully');
    } catch { toast.error('Failed to update user'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await authClient.api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success('User deleted');
    } catch { toast.error('Failed to delete user'); }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: users.length };
    users.forEach((u) => { c[u.role] = (c[u.role] || 0) + 1; });
    return c;
  }, [users]);

  // ── O4O 표준 컬럼 정의 ─────────────────────────────
  const columns: O4OColumn<User>[] = [
    {
      key: 'username',
      header: 'Username',
      sortable: true,
      sortAccessor: (row) => row.username,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.avatar && <img src={row.avatar} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />}
          <button
            onClick={() => navigate(`/users/${row.id}/edit`)}
            className="font-medium text-blue-600 hover:text-blue-800 text-sm"
          >
            {row.username}
          </button>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      sortAccessor: (row) => row.name,
      render: (_, row) => <span className="text-sm text-gray-900">{row.name}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      sortAccessor: (row) => row.email,
      render: (_, row) => (
        <a href={`mailto:${row.email}`} className="text-sm text-blue-600 hover:underline">{row.email}</a>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      sortAccessor: (row) => row.role,
      render: (_, row) => {
        const { label, color } = ROLE_MAP[row.role] || { label: row.role, color: 'text-gray-600 bg-gray-50' };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>;
      },
    },
    {
      key: 'posts',
      header: 'Posts',
      sortable: true,
      sortAccessor: (row) => row.posts,
      align: 'right',
      render: (_, row) => <span className="text-sm tabular-nums">{row.posts}</span>,
    },
    {
      key: 'registeredDate',
      header: 'Registered',
      sortable: true,
      sortAccessor: (row) => row.registeredDate,
      render: (_, row) => <span className="text-sm text-gray-500">{row.registeredDate}</span>,
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
            { key: 'edit', label: '편집', icon: <CheckCircle size={14} />, variant: 'primary', onClick: () => navigate(`/users/${row.id}/edit`) },
            { key: 'quickedit', label: '빠른 편집', onClick: () => openQuickEdit(row) },
            { key: 'delete', label: '삭제', variant: 'danger', icon: <XCircle size={14} />, confirm: '이 사용자를 삭제하시겠습니까?', onClick: () => handleDelete(row.id) },
          ]}
        />
      ),
    },
  ];

  // Quick Edit expand row
  const renderAfterRow = (row: User) => {
    if (expandedId !== row.id) return null;
    return (
      <tr className="bg-blue-50">
        <td colSpan={columns.length + 1} className="px-6 py-4">
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            {(['username', 'name', 'email'] as const).map((field) => (
              <div key={field}>
                <label className="block text-xs text-gray-500 mb-1 capitalize">{field}</label>
                <input
                  className="w-full border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={(quickEdit as any)[field]}
                  onChange={(e) => setQuickEdit({ ...quickEdit, [field]: e.target.value })}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role</label>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={quickEdit.role}
                onChange={(e) => setQuickEdit({ ...quickEdit, role: e.target.value })}
              >
                {TABS.slice(1).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex justify-end gap-2 mt-1">
              <button onClick={() => setExpandedId(null)} className="px-3 py-1 text-sm border rounded hover:bg-gray-100">Cancel</button>
              <button onClick={handleQuickEditSave} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-gray-200 rounded" />
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <PageHeader
        title="Users"
        subtitle="Manage system users"
        backUrl="/"
        backLabel="Dashboard"
        actions={[
          { id: 'add', label: 'Add New', onClick: () => navigate('/users/new'), variant: 'primary', icon: <Plus className="w-4 h-4" /> },
          { id: 'refresh', label: 'Refresh', onClick: fetchUsers, variant: 'secondary', icon: <RefreshCw className="w-4 h-4" /> },
        ]}
      />

      {/* Role Tabs */}
      <div className="flex border-b border-gray-200 mb-4 gap-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'border-admin-blue text-admin-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label} ({counts[tab.id] || 0})
          </button>
        ))}
      </div>

      {/* FilterBar + Bulk Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <FilterBar
          searchPlaceholder="Username, 이름, 이메일 검색..."
          searchValue={search}
          onSearchChange={setSearch}
        >
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
          >
            <option value="">Bulk Actions</option>
            <option value="delete">Delete</option>
            <option value="change-role">Change Role</option>
          </select>
          <button
            onClick={handleBulkAction}
            disabled={selectedKeys.size === 0 || !bulkAction}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Apply ({selectedKeys.size})
          </button>
        </FilterBar>
      </div>

      {/* BaseTable — columnVisibility가 Screen Options를 대체 */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <BaseTable<User>
          columns={columns}
          data={filteredUsers}
          rowKey={(row) => row.id}
          tableId="users-list"
          reorderable
          persistState
          columnVisibility
          selectable
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          renderAfterRow={renderAfterRow}
          emptyMessage="조건에 맞는 사용자가 없습니다."
        />
      </div>
    </div>
  );
}

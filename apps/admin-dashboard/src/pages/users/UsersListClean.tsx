import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  Search
} from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { Column } from '@/components/common/DataTable';

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
  organizationId?: string;
  organizationName?: string;
  supplierId?: string;
  phone?: string;
}

type TabStatus = 'all' | 'super_admin' | 'admin' | 'seller' | 'partner' | 'supplier' | 'customer';

const UsersListClean = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<TabStatus>(() => {
    const saved = sessionStorage.getItem('users-active-tab');
    return (saved as TabStatus) || 'all';
  });

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showScreenOptions, setShowScreenOptions] = useState(false);
  const [selectedBulkAction, setSelectedBulkAction] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Edit state
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [quickEditData, setQuickEditData] = useState({
    id: '',
    name: '',
    email: '',
    role: 'customer',
    username: ''
  });

  // Screen Options
  const [visibleColumns, setVisibleColumns] = useState({
    username: true,
    name: true,
    email: true,
    role: true,
    posts: true,
    registeredDate: true
  });

  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('users-items-per-page');
    return saved ? parseInt(saved) : 20;
  });

  const [currentPage, setCurrentPage] = useState(1);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/admin/users', {
        params: { limit: 1000, page: 1 }
      });

      const userData = response.data?.users || response.data?.data?.users || response.data?.data || response.data || [];

      if (Array.isArray(userData)) {
        const transformedUsers = userData.map((user: any) => ({
          id: user.id || user._id,
          name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
          username: user.username || user.email?.split('@')[0] || 'unknown',
          email: user.email || '',
          role: user.role || 'customer',
          posts: user.postsCount || 0,
          registeredDate: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : '',
          lastLogin: user.lastLogin || user.lastLoginAt ? new Date(user.lastLogin || user.lastLoginAt).toISOString().split('T')[0] : undefined,
          status: user.status || 'active',
          avatar: user.avatar
        }));
        setUsers(transformedUsers);
      } else {
        setUsers([]);
      }
    } catch (err: any) {
      setError('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    sessionStorage.setItem('users-active-tab', activeTab);
  }, [activeTab]);

  // Filtering
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (activeTab !== 'all' && user.role !== activeTab) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          user.username.toLowerCase().includes(query) ||
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [users, activeTab, searchQuery]);

  // Pagination
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Handlers
  const handleBulkAction = async () => {
    if (!selectedBulkAction || selectedUserIds.length === 0) {
      toast.error('Please select an action and users');
      return;
    }

    if (selectedBulkAction === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedUserIds.length} users?`)) return;
      try {
        await Promise.all(selectedUserIds.map(id => authClient.api.delete(`/users/${id}`)));
        setUsers(prev => prev.filter(u => !selectedUserIds.includes(u.id)));
        setSelectedUserIds([]);
        toast.success('Users deleted successfully');
      } catch {
        toast.error('Failed to delete users');
      }
    } else if (selectedBulkAction === 'change-role') {
      const newRole = prompt('Enter new role (super_admin, admin, seller, partner, supplier, customer):');
      if (!newRole) return;
      try {
        await Promise.all(selectedUserIds.map(id => authClient.api.patch(`/users/${id}`, { role: newRole })));
        setUsers(prev => prev.map(u => selectedUserIds.includes(u.id) ? { ...u, role: newRole } : u));
        setSelectedUserIds([]);
        toast.success('Roles updated successfully');
      } catch {
        toast.error('Failed to update roles');
      }
    }
  };

  const handleQuickEdit = (user: User) => {
    if (expandedRowKeys.includes(user.id)) {
      setExpandedRowKeys([]);
    } else {
      setQuickEditData({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username
      });
      setExpandedRowKeys([user.id]);
    }
  };

  const handleQuickEditSave = async () => {
    try {
      await authClient.api.patch(`/users/${quickEditData.id}`, quickEditData);
      setUsers(prev => prev.map(u => u.id === quickEditData.id ? { ...u, ...quickEditData } : u));
      setExpandedRowKeys([]);
      toast.success('User updated successfully');
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await authClient.api.delete(`/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, { label: string; color: string }> = {
      super_admin: { label: 'Super Admin', color: 'text-red-700 bg-red-50' },
      admin: { label: 'Admin', color: 'text-red-600 bg-red-50' },
      seller: { label: 'Seller', color: 'text-green-600 bg-green-50' },
      partner: { label: 'Partner', color: 'text-orange-600 bg-orange-50' },
      supplier: { label: 'Supplier', color: 'text-purple-600 bg-purple-50' },
      customer: { label: 'Customer', color: 'text-gray-600 bg-gray-50' }
    };
    return roleMap[role] || { label: role, color: 'text-gray-600' };
  };

  // Columns
  const columns = useMemo<Column<User>[]>(() => {
    const cols: Column<User>[] = [];

    if (visibleColumns.username) {
      cols.push({
        key: 'username',
        title: 'Username',
        sortable: true,
        dataIndex: 'username', // For sorting
        render: (_, record) => (
          <div className="flex items-center gap-2">
            {record.avatar && <img src={record.avatar} alt="" className="w-8 h-8 rounded-full" />}
            <div className="group relative">
              <button
                onClick={() => navigate(`/users/${record.id}/edit`)}
                className="font-medium text-blue-600 hover:text-blue-800"
              >
                {record.username}
              </button>
              <div className="hidden group-hover:flex gap-2 text-xs text-gray-400 mt-1 absolute bg-white p-1 shadow-sm border rounded z-10 whitespace-nowrap">
                <button onClick={() => navigate(`/users/${record.id}/edit`)} className="text-blue-600 hover:underline">Edit</button>
                <span>|</span>
                <button onClick={() => handleDelete(record.id)} className="text-red-600 hover:underline">Delete</button>
                <span>|</span>
                <button onClick={() => handleQuickEdit(record)} className="text-blue-600 hover:underline">Quick Edit</button>
              </div>
            </div>
          </div>
        )
      });
    }

    if (visibleColumns.name) cols.push({ key: 'name', title: 'Name', dataIndex: 'name', sortable: true });
    if (visibleColumns.email) cols.push({
      key: 'email',
      title: 'Email',
      dataIndex: 'email',
      sortable: true,
      render: (val) => <a href={`mailto:${val}`} className="text-blue-600 hover:underline">{val}</a>
    });
    if (visibleColumns.role) cols.push({
      key: 'role',
      title: 'Role',
      dataIndex: 'role',
      sortable: true,
      render: (val) => {
        const { label, color } = getRoleDisplay(val);
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>;
      }
    });
    if (visibleColumns.posts) cols.push({ key: 'posts', title: 'Posts', dataIndex: 'posts', sortable: true });
    if (visibleColumns.registeredDate) cols.push({ key: 'registeredDate', title: 'Date', dataIndex: 'registeredDate', sortable: true });

    return cols;
  }, [visibleColumns]);

  const counts = useMemo(() => {
    const c: any = { all: users.length };
    users.forEach(u => { c[u.role] = (c[u.role] || 0) + 1; });
    return c;
  }, [users]);

  // Tab definitions
  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'super_admin', label: 'Super Admin' },
    { id: 'admin', label: 'Admin' },
    { id: 'seller', label: 'Seller' },
    { id: 'partner', label: 'Partner' },
    { id: 'supplier', label: 'Supplier' },
    { id: 'customer', label: 'Customer' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 relative">
      <PageHeader
        title="Users"
        subtitle="Manage system users"
        backUrl="/"
        backLabel="Dashboard"
        showSearch
        onSearch={setSearchQuery}
        actions={[
          {
            id: 'add',
            label: 'Add New',
            onClick: () => navigate('/users/new'),
            variant: 'primary',
            icon: <Plus className="w-4 h-4" />
          },
          {
            id: 'options',
            label: 'Screen Options',
            onClick: () => setShowScreenOptions(!showScreenOptions),
            variant: 'secondary',
            icon: <Settings className="w-4 h-4" />
          }
        ]}
      />

      {/* Screen Options Panel */}
      {showScreenOptions && (
        <div className="absolute top-20 right-8 p-4 bg-white border rounded-lg shadow-xl w-64 z-50">
          <h3 className="font-medium mb-3 text-sm">Visible Columns</h3>
          <div className="space-y-2">
            {Object.keys(visibleColumns).map(key => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={visibleColumns[key as keyof typeof visibleColumns]}
                  onChange={e => setVisibleColumns({ ...visibleColumns, [key]: e.target.checked })}
                  className="rounded border-gray-300"
                />
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t">
            <h3 className="font-medium mb-2 text-sm">Pagination</h3>
            <input
              type="number"
              value={itemsPerPage}
              onChange={e => setItemsPerPage(Number(e.target.value) || 20)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabStatus)}
            className={`pb-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-admin-blue text-admin-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            {tab.label} ({counts[tab.id] || 0})
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center gap-2 mb-4">
        <select
          value={selectedBulkAction}
          onChange={e => setSelectedBulkAction(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
        >
          <option value="">Bulk Actions</option>
          <option value="delete">Delete</option>
          <option value="change-role">Change Role</option>
        </select>
        <button
          onClick={handleBulkAction}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50"
        >
          Apply
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <DataTable
          columns={columns}
          dataSource={paginatedUsers}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys: selectedUserIds,
            onChange: setSelectedUserIds
          }}
          expandable={{
            expandedRowKeys: expandedRowKeys,
            rowExpandable: () => true,
            expandedRowRender: (record) => (
              <div className="p-4 bg-gray-50 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Username</label>
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={quickEditData.username}
                    onChange={e => setQuickEditData({ ...quickEditData, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={quickEditData.name}
                    onChange={e => setQuickEditData({ ...quickEditData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={quickEditData.email}
                    onChange={e => setQuickEditData({ ...quickEditData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Role</label>
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={quickEditData.role}
                    onChange={e => setQuickEditData({ ...quickEditData, role: e.target.value })}
                  >
                    {tabs.slice(1).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2 flex justify-end gap-2 mt-2">
                  <button onClick={() => setExpandedRowKeys([])} className="px-3 py-1 text-sm border rounded hover:bg-gray-100">Cancel</button>
                  <button onClick={handleQuickEditSave} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                </div>
              </div>
            )
          }}
          pagination={{
            current: currentPage,
            pageSize: itemsPerPage,
            total: filteredUsers.length,
            onChange: (page) => setCurrentPage(page)
          }}
        />
      </div>
    </div>
  );
};

export default UsersListClean;
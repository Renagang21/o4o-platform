import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown,
  ChevronUp,
  Settings,
  User,
  Mail,
  Shield,
  Calendar,
  Search,
  MoreHorizontal,
  Edit,
  Trash2
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { Pagination } from '@/components/common/Pagination';

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
  // Domain extension properties (WO-DOMAIN-TYPE-EXTENSION)
  organizationId?: string;
  organizationName?: string;
  supplierId?: string;
  phone?: string;
}

type SortField = 'username' | 'email' | 'role' | 'registeredDate' | null;
type SortOrder = 'asc' | 'desc';

const UsersListClean = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters - persist in sessionStorage
  const [activeTab, setActiveTab] = useState<'all' | 'super_admin' | 'admin' | 'seller' | 'partner' | 'supplier' | 'customer'>(() => {
    const saved = sessionStorage.getItem('users-active-tab');
    return (saved as any) || 'all';
  });
  
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showScreenOptions, setShowScreenOptions] = useState(false);
  const [selectedBulkAction, setSelectedBulkAction] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Quick Edit state
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditData, setQuickEditData] = useState({
    name: '',
    email: '',
    role: 'customer',
    username: ''
  });

  // Screen Options - persist in localStorage
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('users-visible-columns');
    return saved ? JSON.parse(saved) : {
      username: true,
      name: true,
      email: true,
      role: true,
      posts: true,
      registeredDate: true
    };
  });

  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('users-items-per-page');
    return saved ? parseInt(saved) : 20;
  });

  const [currentPage, setCurrentPage] = useState(1);

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        // Fetch all users (limit=1000 to get all users at once for client-side pagination)
        const response = await authClient.api.get('/admin/users', {
          params: {
            limit: 1000,
            page: 1
          }
        });

        // Check for both direct data and nested data structure
        const userData = response.data?.users || response.data?.data?.users || response.data?.data || response.data || [];

        if (Array.isArray(userData)) {
          const transformedUsers = userData.map((user: any) => {
            // Construct fullName from firstName and lastName, fallback to name field
            const fullName = user.name ||
                           (user.firstName || user.lastName
                             ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                             : 'Unknown');

            return {
              id: user.id || user._id,
              name: fullName,
              username: user.username || user.email?.split('@')[0] || 'unknown',
              email: user.email || '',
              role: user.role || 'customer',
              posts: user.postsCount || 0,
              registeredDate: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : '',
              lastLogin: user.lastLogin || user.lastLoginAt ? new Date(user.lastLogin || user.lastLoginAt).toISOString().split('T')[0] : undefined,
              status: user.status || 'active',
              avatar: user.avatar
            };
          });

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

    fetchUsers();
  }, []);

  // Save activeTab to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('users-active-tab', activeTab);
  }, [activeTab]);

  // Save Screen Options to localStorage
  useEffect(() => {
    localStorage.setItem('users-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('users-items-per-page', itemsPerPage.toString());
  }, [itemsPerPage]);

  // Clean up hover timeout
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, itemsPerPage]);

  // Filter users based on activeTab and searchQuery
  const filteredUsers = users.filter(user => {
    // Filter by role
    if (activeTab !== 'all' && user.role !== activeTab) {
      return false;
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return user.username.toLowerCase().includes(query) ||
             user.name.toLowerCase().includes(query) ||
             user.email.toLowerCase().includes(query);
    }
    
    return true;
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0;

    let aVal = a[sortField];
    let bVal = b[sortField];

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return 0;
  });

  // Paginate users
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  // Count users by role
  const getCounts = () => {
    return {
      all: users.length,
      super_admin: users.filter(u => u.role === 'super_admin').length,
      admin: users.filter(u => u.role === 'admin').length,
      seller: users.filter(u => u.role === 'seller').length,
      partner: users.filter(u => u.role === 'partner').length,
      supplier: users.filter(u => u.role === 'supplier').length,
      customer: users.filter(u => u.role === 'customer').length
    };
  };

  const counts = getCounts();

  // Handle row hover with delay
  const handleRowMouseEnter = (userId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredRow(userId);
    }, 300);
  };

  const handleRowMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredRow(null);
  };

  // Handle bulk actions
  const handleBulkAction = async () => {
    if (!selectedBulkAction) {
      toast.error('Please select a bulk action');
      return;
    }

    if (selectedUsers.size === 0) {
      toast.error('Please select users first');
      return;
    }

    if (selectedBulkAction === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedUsers.size} user(s)?`)) {
        return;
      }

      try {
        // API call to delete users
        await Promise.all(
          Array.from(selectedUsers).map(id => 
            authClient.api.delete(`/users/${id}`)
          )
        );
        
        setUsers(prev => prev.filter(u => !selectedUsers.has(u.id)));
        setSelectedUsers(new Set());
        toast.success(`${selectedUsers.size} user(s) deleted`);
      } catch (error) {
        toast.error('Failed to delete users');
      }
    } else if (selectedBulkAction === 'change-role') {
      // Show role change dialog
      const newRole = prompt('Enter new role (super_admin, admin, seller, partner, supplier, customer):');
      if (!newRole) return;

      try {
        await Promise.all(
          Array.from(selectedUsers).map(id => 
            authClient.api.patch(`/users/${id}`, { role: newRole })
          )
        );
        
        setUsers(prev => prev.map(u => 
          selectedUsers.has(u.id) ? { ...u, role: newRole } : u
        ));
        setSelectedUsers(new Set());
        toast.success(`Role changed for ${selectedUsers.size} user(s)`);
      } catch (error) {
        toast.error('Failed to change roles');
      }
    }
    
    setSelectedBulkAction('');
  };

  // Handle quick edit
  const handleQuickEdit = (user: User) => {
    setQuickEditId(user.id);
    setQuickEditData({
      name: user.name,
      email: user.email,
      role: user.role,
      username: user.username
    });
  };

  const handleQuickEditSave = async () => {
    try {
      await authClient.api.patch(`/users/${quickEditId}`, quickEditData);
      
      setUsers(prev => prev.map(u => 
        u.id === quickEditId 
          ? { ...u, ...quickEditData }
          : u
      ));
      
      setQuickEditId(null);
      toast.success('User updated successfully');
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map(u => u.id)));
    }
  };

  // Handle delete user
  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await authClient.api.delete(`/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('User deleted successfully');
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  // Role display helper
  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, { label: string; color: string }> = {
      super_admin: { label: 'Super Admin', color: 'text-red-700' },
      admin: { label: 'Admin', color: 'text-red-600' },
      seller: { label: 'Seller', color: 'text-green-600' },
      partner: { label: 'Partner', color: 'text-orange-600' },
      supplier: { label: 'Supplier', color: 'text-purple-600' },
      customer: { label: 'Customer', color: 'text-gray-600' }
    };

    return roleMap[role] || { label: role, color: 'text-gray-600' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-3">
        <div className="flex items-center justify-between">
          <AdminBreadcrumb
            items={[
              { label: 'Dashboard', path: '/' },
              { label: 'Users', path: '/users' }
            ]}
          />

          {/* Screen Options Button */}
          <button
            onClick={() => setShowScreenOptions(!showScreenOptions)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
            Screen Options
          </button>
        </div>

        {/* Screen Options Panel */}
        {showScreenOptions && (
          <div className="absolute right-8 mt-2 p-4 bg-white border rounded-lg shadow-xl w-80 z-50">
            <h3 className="font-medium mb-3">Screen Options</h3>

            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Columns</h4>
              <div className="space-y-2">
                {Object.entries({
                  username: 'Username',
                  name: 'Name',
                  email: 'Email',
                  role: 'Role',
                  posts: 'Posts',
                  registeredDate: 'Date'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={visibleColumns[key as keyof typeof visibleColumns]}
                      onChange={(e) => setVisibleColumns({
                        ...visibleColumns,
                        [key]: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Pagination</h4>
              <div className="flex items-center gap-2">
                <span className="text-sm">Number of items per page:</span>
                <input
                  type="number"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(parseInt(e.target.value) || 20)}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-8 py-6">
        {/* Title and Add New */}
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-normal">Users</h1>
          <button
            onClick={() => navigate('/users/new')}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Add New User
          </button>
        </div>

        {/* Role Filter Tabs */}
        <ul className="flex gap-2 text-sm mb-4 flex-wrap">
          <li>
            <button
              onClick={() => setActiveTab('all')}
              className={activeTab === 'all' ? 'font-medium' : 'text-blue-600 hover:text-blue-800'}
            >
              All ({counts.all})
            </button>
          </li>
          <li className="text-gray-400">|</li>
          <li>
            <button
              onClick={() => setActiveTab('super_admin')}
              className={activeTab === 'super_admin' ? 'font-medium' : 'text-blue-600 hover:text-blue-800'}
            >
              Super Admin ({counts.super_admin})
            </button>
          </li>
          <li className="text-gray-400">|</li>
          <li>
            <button
              onClick={() => setActiveTab('admin')}
              className={activeTab === 'admin' ? 'font-medium' : 'text-blue-600 hover:text-blue-800'}
            >
              Admin ({counts.admin})
            </button>
          </li>
          <li className="text-gray-400">|</li>
          <li>
            <button
              onClick={() => setActiveTab('seller')}
              className={activeTab === 'seller' ? 'font-medium' : 'text-blue-600 hover:text-blue-800'}
            >
              Seller ({counts.seller})
            </button>
          </li>
          <li className="text-gray-400">|</li>
          <li>
            <button
              onClick={() => setActiveTab('partner')}
              className={activeTab === 'partner' ? 'font-medium' : 'text-blue-600 hover:text-blue-800'}
            >
              Partner ({counts.partner})
            </button>
          </li>
          <li className="text-gray-400">|</li>
          <li>
            <button
              onClick={() => setActiveTab('supplier')}
              className={activeTab === 'supplier' ? 'font-medium' : 'text-blue-600 hover:text-blue-800'}
            >
              Supplier ({counts.supplier})
            </button>
          </li>
          <li className="text-gray-400">|</li>
          <li>
            <button
              onClick={() => setActiveTab('customer')}
              className={activeTab === 'customer' ? 'font-medium' : 'text-blue-600 hover:text-blue-800'}
            >
              Customer ({counts.customer})
            </button>
          </li>
        </ul>

        {/* Search and Bulk Actions */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <select
              value={selectedBulkAction}
              onChange={(e) => setSelectedBulkAction(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="">Bulk actions</option>
              <option value="delete">Delete</option>
              <option value="change-role">Change role</option>
            </select>
            <button
              onClick={handleBulkAction}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Apply
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1 border border-gray-300 rounded text-sm w-64"
              />
            </div>
            <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
              Search
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="w-10 px-4 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === paginatedUsers.length && paginatedUsers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                {visibleColumns.username && (
                  <th className="px-4 py-2 text-left">
                    <button
                      onClick={() => handleSort('username')}
                      className="flex items-center gap-1 font-normal text-sm hover:text-blue-600"
                    >
                      Username
                      {sortField === 'username' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                )}
                {visibleColumns.name && (
                  <th className="px-4 py-2 text-left">
                    <span className="text-sm font-normal">Name</span>
                  </th>
                )}
                {visibleColumns.email && (
                  <th className="px-4 py-2 text-left">
                    <button
                      onClick={() => handleSort('email')}
                      className="flex items-center gap-1 font-normal text-sm hover:text-blue-600"
                    >
                      Email
                      {sortField === 'email' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                )}
                {visibleColumns.role && (
                  <th className="px-4 py-2 text-left">
                    <button
                      onClick={() => handleSort('role')}
                      className="flex items-center gap-1 font-normal text-sm hover:text-blue-600"
                    >
                      Role
                      {sortField === 'role' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                )}
                {visibleColumns.posts && (
                  <th className="px-4 py-2 text-left">
                    <span className="text-sm font-normal">Posts</span>
                  </th>
                )}
                {visibleColumns.registeredDate && (
                  <th className="px-4 py-2 text-left">
                    <button
                      onClick={() => handleSort('registeredDate')}
                      className="flex items-center gap-1 font-normal text-sm hover:text-blue-600"
                    >
                      Date
                      {sortField === 'registeredDate' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(v => v).length + 1} className="px-4 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <React.Fragment key={user.id}>
                    <tr
                      className="border-b hover:bg-gray-50 transition-colors"
                      onMouseEnter={() => handleRowMouseEnter(user.id)}
                      onMouseLeave={handleRowMouseLeave}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedUsers);
                            if (e.target.checked) {
                              newSelected.add(user.id);
                            } else {
                              newSelected.delete(user.id);
                            }
                            setSelectedUsers(newSelected);
                          }}
                          className="rounded border-gray-300"
                        />
                      </td>
                      {visibleColumns.username && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {user.avatar && (
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <div>
                              <button
                                onClick={() => navigate(`/users/${user.id}/edit`)}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                {user.username}
                              </button>
                              {hoveredRow === user.id && (
                                <div className="flex gap-2 mt-1 text-xs">
                                  <button
                                    onClick={() => navigate(`/users/${user.id}/edit`)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    Edit
                                  </button>
                                  <span className="text-gray-400">|</span>
                                  <button
                                    onClick={() => handleDelete(user.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    Delete
                                  </button>
                                  <span className="text-gray-400">|</span>
                                  <button
                                    onClick={() => handleQuickEdit(user)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    Quick Edit
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.name && (
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {user.name}
                        </td>
                      )}
                      {visibleColumns.email && (
                        <td className="px-4 py-3">
                          <a href={`mailto:${user.email}`} className="text-sm text-blue-600 hover:text-blue-800">
                            {user.email}
                          </a>
                        </td>
                      )}
                      {visibleColumns.role && (
                        <td className="px-4 py-3">
                          <span className={`text-sm ${getRoleDisplay(user.role).color}`}>
                            {getRoleDisplay(user.role).label}
                          </span>
                        </td>
                      )}
                      {visibleColumns.posts && (
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {user.posts > 0 ? (
                            <button className="text-blue-600 hover:text-blue-800">
                              {user.posts}
                            </button>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.registeredDate && (
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {user.registeredDate}
                        </td>
                      )}
                    </tr>
                    
                    {/* Quick Edit Row */}
                    {quickEditId === user.id && (
                      <tr className="bg-gray-50 border-b">
                        <td colSpan={Object.values(visibleColumns).filter(v => v).length + 1} className="px-4 py-4">
                          <div className="flex gap-4">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Username</label>
                              <input
                                type="text"
                                value={quickEditData.username}
                                onChange={(e) => setQuickEditData({ ...quickEditData, username: e.target.value })}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Name</label>
                              <input
                                type="text"
                                value={quickEditData.name}
                                onChange={(e) => setQuickEditData({ ...quickEditData, name: e.target.value })}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Email</label>
                              <input
                                type="email"
                                value={quickEditData.email}
                                onChange={(e) => setQuickEditData({ ...quickEditData, email: e.target.value })}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Role</label>
                              <select
                                value={quickEditData.role}
                                onChange={(e) => setQuickEditData({ ...quickEditData, role: e.target.value })}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="super_admin">Super Admin</option>
                                <option value="admin">Admin</option>
                                <option value="seller">Seller</option>
                                <option value="partner">Partner</option>
                                <option value="supplier">Supplier</option>
                                <option value="customer">Customer</option>
                              </select>
                            </div>
                            <div className="flex items-end gap-2">
                              <button
                                onClick={handleQuickEditSave}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                              >
                                Update
                              </button>
                              <button
                                onClick={() => setQuickEditId(null)}
                                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 bg-white border rounded-lg overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedUsers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* Screen Options - Moved to header */}
        <div className="hidden">
          <button
            onClick={() => setShowScreenOptions(!showScreenOptions)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-lg hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
            Screen Options
          </button>
          
          {showScreenOptions && (
            <div className="absolute bottom-full right-0 mb-2 p-4 bg-white border rounded-lg shadow-xl w-80">
              <h3 className="font-medium mb-3">Screen Options</h3>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Columns</h4>
                <div className="space-y-2">
                  {Object.entries({
                    username: 'Username',
                    name: 'Name',
                    email: 'Email',
                    role: 'Role',
                    posts: 'Posts',
                    registeredDate: 'Date'
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={visibleColumns[key as keyof typeof visibleColumns]}
                        onChange={(e) => setVisibleColumns({
                          ...visibleColumns,
                          [key]: e.target.checked
                        })}
                        className="rounded border-gray-300"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Pagination</h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Number of items per page:</span>
                  <input
                    type="number"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(parseInt(e.target.value) || 20)}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersListClean;
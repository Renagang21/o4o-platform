import { FC, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WordPressTable, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTable';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { useBulkActions } from '@/hooks/useBulkActions';
import { api } from '@/api/base';
import { UserRole } from '@o4o/types';
import { roleDisplayNames } from "@/types/user";
import toast from 'react-hot-toast';
import { Building2, UserCheck, UserX, Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  role: UserRole;
  roles: string[];
  status: 'active' | 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserListResponse {
  users: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * WordPress-style User list
 * Standardized with WordPressTable component
 */
const UserList: FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get<{ success: boolean; data: UserListResponse }>(`/api/v1/users?${params}`);
      
      if (response.data.success) {
        setUsers(response.data.data.users);
        setTotal(response.data.data.pagination.total);
        setTotalPages(response.data.data.pagination.totalPages);
      }
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, limit, search, roleFilter, statusFilter]);

  // Bulk approve mutation
  const handleBulkApprove = async (userIds: string[]) => {
    try {
      await api.post('/api/v1/users/bulk-approve', {
        userIds,
        notes: 'Bulk approved via admin dashboard',
      });
      toast.success(`${userIds.length} users approved successfully`);
      setSelectedRows([]);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to approve users');
    }
  };

  // Bulk reject mutation
  const handleBulkReject = async (userIds: string[]) => {
    try {
      await api.post('/api/v1/users/bulk-reject', {
        userIds,
        notes: 'Bulk rejected via admin dashboard',
      });
      toast.success(`${userIds.length} users rejected successfully`);
      setSelectedRows([]);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to reject users');
    }
  };

  // Bulk role change mutation
  const handleBulkRoleChange = async (userIds: string[], role: UserRole) => {
    try {
      await api.post('/api/v1/users/bulk-role', {
        userIds,
        role,
      });
      toast.success(`Role updated for ${userIds.length} users`);
      setSelectedRows([]);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user roles');
    }
  };

  // Individual user actions
  const handleApprove = async (userId: string) => {
    try {
      await api.post(`/api/v1/users/${userId}/approve`);
      toast.success('User approved successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to approve user');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await api.post(`/api/v1/users/${userId}/reject`);
      toast.success('User rejected successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to reject user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/api/v1/users/${userId}`);
        toast.success('User deleted successfully');
        fetchUsers();
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  // Export to CSV
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/api/v1/users/export/csv?${params}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to export users');
    }
  };

  // Bulk actions configuration
  const bulkActions = [
    {
      value: 'approve',
      label: 'Approve',
      action: async (ids: string[]) => {
        await handleBulkApprove(ids);
      },
      confirmMessage: 'Are you sure you want to approve {count} user(s)?'
    },
    {
      value: 'reject',
      label: 'Reject',
      action: async (ids: string[]) => {
        await handleBulkReject(ids);
      },
      confirmMessage: 'Are you sure you want to reject {count} user(s)?'
    },
    {
      value: 'role-customer',
      label: 'Change Role to Customer',
      action: async (ids: string[]) => {
        await handleBulkRoleChange(ids, 'customer' as UserRole);
      }
    },
    {
      value: 'role-vendor',
      label: 'Change Role to Vendor',
      action: async (ids: string[]) => {
        await handleBulkRoleChange(ids, 'vendor' as UserRole);
      }
    },
    {
      value: 'role-seller',
      label: 'Change Role to Seller',
      action: async (ids: string[]) => {
        await handleBulkRoleChange(ids, 'seller' as UserRole);
      }
    }
  ];

  const {
    selectedCount,
    isProcessing,
    executeBulkAction
  } = useBulkActions({
    items: users,
    idField: 'id',
    actions: bulkActions,
    selectedIds: selectedRows
  });

  // Get role badge style - UPDATED COLORS v4.0
  const getRoleBadgeStyle = (role: string) => {
    const styles: Record<string, string> = {
      super_admin: 'bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold',
      admin: 'bg-gradient-to-r from-red-500 to-red-700 text-white font-bold',
      vendor: 'bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold',
      seller: 'bg-gradient-to-r from-green-500 to-green-700 text-white font-bold',
      customer: 'bg-gradient-to-r from-gray-500 to-gray-700 text-white font-bold',
      business: 'bg-gradient-to-r from-yellow-500 to-yellow-700 text-white font-bold',
      moderator: 'bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-bold',
      partner: 'bg-gradient-to-r from-pink-500 to-pink-700 text-white font-bold',
    };
    return styles[role] || 'bg-gradient-to-r from-gray-500 to-gray-700 text-white font-bold';
  };

  // Get status badge style
  const getStatusBadgeStyle = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-500 text-white',
      approved: 'bg-green-500 text-white',
      pending: 'bg-yellow-500 text-white',
      rejected: 'bg-red-500 text-white',
    };
    return styles[status] || 'bg-gray-500 text-white';
  };

  // Table columns configuration
  const columns: WordPressTableColumn[] = [
    {
      id: 'name',
      label: 'Name',
      sortable: true
    },
    {
      id: 'email',
      label: 'Email'
    },
    {
      id: 'role',
      label: 'Role',
      width: '150px'
    },
    {
      id: 'status',
      label: 'Status',
      width: '120px'
    },
    {
      id: 'verified',
      label: 'Verified',
      width: '100px',
      align: 'center'
    },
    {
      id: 'lastLogin',
      label: 'Last Login',
      width: '150px'
    },
    {
      id: 'joined',
      label: 'Joined',
      sortable: true,
      width: '150px'
    }
  ];

  // Transform users to table rows
  const rows: WordPressTableRow[] = users.map((user: User) => ({
    id: user.id,
    data: {
      name: (
        <div>
          <Link to={`/users/${user.id}`} className="font-medium text-blue-600 hover:text-blue-800">
            {user.fullName || user.email}
          </Link>
          {(['business', 'vendor', 'seller'].includes(user.role)) && (
            <Building2 className="inline-block ml-2 h-4 w-4 text-blue-500" title="Business Account" />
          )}
        </div>
      ),
      email: (
        <div className="text-sm">
          {user.email}
        </div>
      ),
      role: (
        <div className="flex gap-1 flex-wrap">
          {user.roles.map((role) => (
            <Badge
              key={role}
              className={getRoleBadgeStyle(role)}
            >
              {roleDisplayNames[role as keyof typeof roleDisplayNames] || role}
            </Badge>
          ))}
        </div>
      ),
      status: (
        <Badge className={getStatusBadgeStyle(user.status)}>
          {user.status}
        </Badge>
      ),
      verified: user.isEmailVerified ? (
        <UserCheck className="w-4 h-4 text-green-600 mx-auto" />
      ) : (
        <UserX className="w-4 h-4 text-gray-400 mx-auto" />
      ),
      lastLogin: (
        <div className="text-sm text-gray-600">
          {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
        </div>
      ),
      joined: (
        <div className="text-sm text-gray-600">
          {formatDate(user.createdAt)}
        </div>
      )
    },
    actions: [
      {
        label: 'View',
        onClick: () => navigate(`/users/${user.id}`)
      },
      {
        label: 'Edit',
        onClick: () => navigate(`/users/${user.id}/edit`)
      },
      ...(user.status === 'pending' ? [
        {
          label: 'Approve',
          onClick: () => handleApprove(user.id),
          className: 'text-green-600'
        },
        {
          label: 'Reject',
          onClick: () => handleReject(user.id),
          className: 'text-red-600'
        }
      ] : []),
      {
        label: 'Delete',
        onClick: () => handleDelete(user.id),
        className: 'text-red-600'
      }
    ]
  }));

  // Handle row selection
  const handleSelectRow = (rowId: string, selected: boolean) => {
    if (selected) {
      setSelectedRows([...selectedRows, rowId]);
    } else {
      setSelectedRows(selectedRows.filter(id => id !== rowId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRows(users.map(u => u.id));
    } else {
      setSelectedRows([]);
    }
  };

  return (
    <div className="wrap">
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white p-6 rounded-xl mb-4 shadow-2xl animate-bounce">
        <h1 className="text-3xl font-bold">⭐ Users Management v5.0 ⭐</h1>
        <p className="text-lg mt-2">배포 완전 성공! - {new Date().toLocaleString('ko-KR')}</p>
        <p className="text-md mt-1">정확한 경로: /users (회원 관리)</p>
      </div>
      <h1 className="wp-heading-inline">Users</h1>
      <Link to="/users/add" className="page-title-action bg-green-500 text-white hover:bg-green-600">
        Add New User 🎉
      </Link>
      <hr className="wp-header-end" />

      {/* Filters */}
      <div className="wp-filter">
        <div className="filter-items">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Roles</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
              <SelectItem value="seller">Seller</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="search-box">
            <Input
              type="search"
              placeholder="Search users..."
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              className="w-[300px]"
            />
            <Button variant="secondary">
              Search Users
            </Button>
          </div>

          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Bulk Actions - Top */}
      <BulkActionBar
        actions={bulkActions}
        selectedCount={selectedCount}
        onActionExecute={executeBulkAction}
        isProcessing={isProcessing}
        position="top"
      />

      {/* WordPress Table */}
      <WordPressTable
        columns={columns}
        rows={rows}
        selectable={true}
        selectedRows={selectedRows}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        loading={loading}
        emptyMessage="No users found. Add your first user!"
      />

      {/* Bulk Actions - Bottom */}
      <BulkActionBar
        actions={bulkActions}
        selectedCount={selectedCount}
        onActionExecute={executeBulkAction}
        isProcessing={isProcessing}
        position="bottom"
      />

      {/* Pagination */}
      <div className="tablenav bottom">
        <div className="tablenav-pages">
          <span className="displaying-num">{total} items</span>
          <span className="pagination-links">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              ‹ Previous
            </Button>
            
            <span className="paging-input">
              <span className="current-page">{page}</span> of <span className="total-pages">{totalPages}</span>
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next ›
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
};

export default UserList;
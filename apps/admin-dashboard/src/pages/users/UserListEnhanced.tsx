import { roleDisplayNames } from "@/types/user";
import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom'; // Not used
// import { UserPlus } from 'lucide-react'; // Not used
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { WordPressTable, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTable';
// import { RowAction } from '@/components/common/RowActions'; // Type is exported from WordPressTable
import { ScreenOptionsReact } from '@/components/common/ScreenOptionsEnhanced';
import { useScreenOptions, ColumnOption } from '@/hooks/useScreenOptions';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { api } from '@/api/base';
import { UserRole } from '@o4o/types';
import { formatDistanceToNow } from 'date-fns';

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

export default function UserListEnhanced() {
  // const navigate = useNavigate(); // Not used
  const { success, error } = useAdminNotices();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Default column configuration
  const defaultColumns: ColumnOption[] = [
    { id: 'name', label: 'Name', visible: true, required: true },
    { id: 'email', label: 'Email', visible: true },
    { id: 'role', label: 'Role', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'posts', label: 'Posts', visible: false },
    { id: 'lastLogin', label: 'Last Login', visible: true },
    { id: 'registered', label: 'Registered', visible: true }
  ];

  // Use screen options hook
  const {
    options,
    itemsPerPage,
    isColumnVisible,
    updateColumnVisibility,
    setItemsPerPage
  } = useScreenOptions('users-list', {
    columns: defaultColumns,
    itemsPerPage: 20
  });

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString() as any,
        limit: itemsPerPage.toString() as any,
      });
      
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get<{ success: boolean; data: UserListResponse }>(`/v1/users?${params}`);
      
      if (response.data.success) {
        setUsers(response.data.data.users);
        setTotal(response.data.data.pagination.total);
        setTotalPages(response.data.data.pagination.totalPages);
      }
    } catch (err: any) {
    // Error logging - use proper error handler
      error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, itemsPerPage, search, roleFilter, statusFilter]);

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      error('No users selected.');
      return;
    }

    try {
      switch (action) {
        case 'approve':
          await api.post('/v1/users/bulk-approve', {
            userIds: selectedUsers,
            notes: 'Bulk approved via admin dashboard',
          });
          success(`${selectedUsers.length} users approved successfully.`);
          break;
        case 'delete':
          await api.post('/v1/users/bulk-delete', { userIds: selectedUsers });
          success(`${selectedUsers.length} users deleted.`);
          break;
      }
      setSelectedUsers([]);
      fetchUsers();
    } catch (err: any) {
      error('Failed to perform bulk action.');
    }
  };

  // Individual user actions
  const handleApprove = async (userId: string) => {
    try {
      await api.post(`/v1/users/${userId}/approve`);
      success('User approved successfully.');
      fetchUsers();
    } catch (err: any) {
      error('Failed to approve user.');
    }
  };

  const handleDelete = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/v1/users/${userId}`);
        success('User deleted.');
        fetchUsers();
      } catch (err: any) {
        error('Failed to delete user.');
      }
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-purple-500',
      admin: 'bg-red-500',
      vendor: 'bg-blue-500',
      seller: 'bg-green-500',
      customer: 'bg-gray-500',
      business: 'bg-yellow-500',
      moderator: 'bg-indigo-500',
      partner: 'bg-pink-500',
    };
    return colors[role as keyof typeof roleDisplayNames] || 'bg-gray-500';
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500',
      approved: 'bg-green-500',
      pending: 'bg-yellow-500',
      rejected: 'bg-red-500',
    };
    return <Badge className={`${colors[status] || 'bg-gray-500'} text-white`}>{status}</Badge>;
  };

  // Define table columns - only show visible ones
  const allColumns: WordPressTableColumn[] = [
    { id: 'name', label: 'Name', sortable: true },
    { id: 'email', label: 'Email', sortable: true },
    { id: 'role', label: 'Role' },
    { id: 'status', label: 'Status' },
    { id: 'posts', label: 'Posts', align: 'center' },
    { id: 'lastLogin', label: 'Last Login' },
    { id: 'registered', label: 'Registered', sortable: true }
  ];
  
  const columns = allColumns.filter((col: any) => isColumnVisible(col.id));

  // Transform users to table rows
  const rows: WordPressTableRow[] = users.map((user: any) => ({
    id: user.id,
    data: {
      name: (
        <div>
          <strong>
            <a href={`/users/${user.id}`} className="row-title">
              {user.fullName || user.email}
            </a>
          </strong>
        </div>
      ),
      email: (
        <div className="flex items-center gap-2">
          {user.email}
          {user.isEmailVerified && (
            <Badge variant="secondary" className="text-xs">
              Verified
            </Badge>
          )}
        </div>
      ),
      role: (
        <div className="flex gap-1 flex-wrap">
          {user.roles.map((role: any) => (
            <Badge
              key={role}
              className={`${getRoleBadgeColor(role)} text-white`}
            >
              {role.replace('_', ' ')}
            </Badge>
          ))}
        </div>
      ),
      status: getStatusBadge(user.status),
      posts: <span className="text-center">0</span>,
      lastLogin: user.lastLoginAt
        ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })
        : 'Never',
      registered: formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })
    },
    actions: [
      { label: 'Edit', href: `/users/${user.id}/edit` },
      { label: 'View', href: `/users/${user.id}` },
      ...(user.status === 'pending' ? [
        { label: 'Approve', onClick: () => handleApprove(user.id) }
      ] : []),
      { 
        label: 'Delete', 
        onClick: () => handleDelete(user.id),
        isDelete: true 
      }
    ]
  }));

  return (
    <div className="wrap">
      {/* Screen Options */}
      <div className="relative">
        <ScreenOptionsReact
          title="Screen Options"
          columns={options.columns || defaultColumns}
          onColumnToggle={updateColumnVisibility}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
      
      <h1 className="wp-heading-inline">Users</h1>
      <a href="/users/add" className="page-title-action">Add New</a>
      
      {/* Views */}
      <ul className="subsubsub">
        <li className="all">
          <a href="#" className={!statusFilter ? 'current' : ''}>
            All <span className="count">({total})</span>
          </a> |
        </li>
        <li className="administrator">
          <a href="#" onClick={() => setRoleFilter('admin')}>
            Administrator <span className="count">(2)</span>
          </a> |
        </li>
        <li className="pending">
          <a href="#" onClick={() => setStatusFilter('pending')}>
            Pending <span className="count">(5)</span>
          </a>
        </li>
      </ul>
      
      {/* Search Box */}
      <p className="search-box">
        <label className="screen-reader-text" htmlFor="user-search-input">
          Search Users:
        </label>
        <Input
          type="search"
          id="user-search-input"
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-auto inline-block mr-2"
        />
        <Button variant="secondary" size="sm">
          Search Users
        </Button>
      </p>

      {/* Bulk Actions */}
      <div className="tablenav top">
        <div className="alignleft actions bulkactions">
          <Select value="" onValueChange={handleBulkAction}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Bulk actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="approve">Approve</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="secondary" 
            size="sm"
            disabled={selectedUsers.length === 0}
          >
            Apply
          </Button>
        </div>
        
        <div className="alignleft actions">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All roles</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm">Filter</Button>
        </div>
        
        <div className="tablenav-pages">
          <span className="displaying-num">{total} items</span>
        </div>
        
        <br className="clear" />
      </div>

      {/* Users Table */}
      <WordPressTable
        columns={columns}
        rows={rows}
        selectable={true}
        selectedRows={selectedUsers}
        onSelectRow={(id, selected) => {
          if (selected) {
            setSelectedUsers([...selectedUsers, id]);
          } else {
            setSelectedUsers(selectedUsers.filter((userId: any) => userId !== id));
          }
        }}
        onSelectAll={(selected) => {
          if (selected) {
            setSelectedUsers(users.map((u: any) => u.id));
          } else {
            setSelectedUsers([]);
          }
        }}
        loading={loading}
        emptyMessage="No users found."
      />
      
      {/* Bottom navigation */}
      <div className="tablenav bottom">
        <div className="tablenav-pages">
          <span className="displaying-num">{total} items</span>
          <span className="pagination-links">
            <Button
              variant="link"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              ‹
            </Button>
            <span className="paging-input">
              <label htmlFor="current-page-selector" className="screen-reader-text">
                Current Page
              </label>
              <input
                className="current-page"
                id="current-page-selector"
                type="text"
                name="paged"
                value={page}
                size={1}
                aria-describedby="table-paging"
              />
              <span className="tablenav-paging-text">
                {' '}of <span className="total-pages">{totalPages}</span>
              </span>
            </span>
            <Button
              variant="link"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              ›
            </Button>
          </span>
        </div>
        <br className="clear" />
      </div>
    </div>
  );
}
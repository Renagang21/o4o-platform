/**
 * Users List Page - 사용자 목록 조회, 검색, 필터링, 페이지네이션
 * WordPress 스타일 사용자 관리 인터페이스
 * Standardized with WordPressTable component
 */

import { FC, useState } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/base';
import toast from 'react-hot-toast';
import { User, UserRole, UserStatus, ROLE_LABELS, STATUS_LABELS } from '../../types/user';
import { Shield, Download, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import UserDeleteModal from '../../components/users/UserDeleteModal';
import UserRoleChangeModal from '../../components/users/UserRoleChangeModal';

// API 응답 타입 정의
interface UsersResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: {
      current: number;
      total: number;
      count: number;
      totalItems: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  message: string;
}

const UsersList: FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // 모달 상태
  const [deleteModal, setDeleteModal] = useState<{
    _isOpen: boolean;
    users: User | User[];
  }>({
    _isOpen: false,
    users: [] as User[]
  });
  
  const [roleChangeModal, setRoleChangeModal] = useState<{
    _isOpen: boolean;
    users: User[];
  }>({
    _isOpen: false,
    users: []
  });

  // 사용자 목록 조회
  const { data: usersData, isLoading, error, refetch } = useQuery<UsersResponse>({
    queryKey: ['users', page, limit, roleFilter, statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (roleFilter && roleFilter !== 'all') {
        params.append('role', roleFilter);
      }
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await apiClient.get(`/v1/users?${params}`);
      return response.data;
    }
  });

  const users = usersData?.data?.users || [];
  const pagination = usersData?.data?.pagination;

  // 사용자 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      await Promise.all(userIds.map(id => apiClient.delete(`/v1/users/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Users deleted successfully');
      setSelectedRows([]);
      setDeleteModal({ _isOpen: false, users: [] });
    },
    onError: () => {
      toast.error('Failed to delete users');
    }
  });

  // 역할 변경 mutation
  const roleChangeMutation = useMutation({
    mutationFn: async ({ userIds, role }: { userIds: string[], role: UserRole }) => {
      await Promise.all(userIds.map(id => 
        apiClient.patch(`/v1/users/${id}`, { role })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User roles updated successfully');
      setSelectedRows([]);
      setRoleChangeModal({ _isOpen: false, users: [] });
    },
    onError: () => {
      toast.error('Failed to update user roles');
    }
  });

  // CSV 내보내기
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await apiClient.get(`/v1/users/export/csv?${params}`, {
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
      value: 'delete',
      label: 'Delete',
      action: async (ids: string[]) => {
        const selectedUsers = users.filter(u => ids.includes(u.id));
        setDeleteModal({ _isOpen: true, users: selectedUsers });
      },
      isDestructive: true
    },
    {
      value: 'change-role',
      label: 'Change Role',
      action: async (ids: string[]) => {
        const selectedUsers = users.filter(u => ids.includes(u.id));
        setRoleChangeModal({ _isOpen: true, users: selectedUsers });
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

  // Get role badge style
  const getRoleBadgeVariant = (role: UserRole): any => {
    const variants: Record<UserRole, any> = {
      super_admin: 'destructive',
      admin: 'destructive',
      vendor: 'default',
      seller: 'secondary',
      customer: 'outline',
      business: 'secondary',
      moderator: 'default',
      partner: 'secondary'
    };
    return variants[role] || 'outline';
  };

  // Get status badge style
  const getStatusBadgeVariant = (status: UserStatus): any => {
    const variants: Record<UserStatus, any> = {
      active: 'default',
      inactive: 'secondary',
      pending: 'outline',
      suspended: 'destructive'
    };
    return variants[status] || 'outline';
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
      width: '120px'
    },
    {
      id: 'status',
      label: 'Status',
      width: '100px'
    },
    {
      id: 'posts',
      label: 'Posts',
      width: '80px',
      align: 'center'
    },
    {
      id: 'registered',
      label: 'Registered',
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
            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
          </Link>
          {user.isSuperAdmin && (
            <Shield className="inline-block ml-2 h-4 w-4 text-red-500" title="Super Admin" />
          )}
        </div>
      ),
      email: (
        <div className="flex items-center gap-2">
          <a href={`mailto:${user.email}`} className="text-blue-600 hover:text-blue-800">
            {user.email}
          </a>
          {user.emailVerified ? (
            <CheckCircle className="w-4 h-4 text-green-500" title="Email Verified" />
          ) : (
            <XCircle className="w-4 h-4 text-gray-400" title="Email Not Verified" />
          )}
        </div>
      ),
      role: (
        <Badge variant={getRoleBadgeVariant(user.role)}>
          {ROLE_LABELS[user.role]}
        </Badge>
      ),
      status: (
        <Badge variant={getStatusBadgeVariant(user.status)}>
          {STATUS_LABELS[user.status]}
        </Badge>
      ),
      posts: (
        <span className="text-center block">{user.postCount || 0}</span>
      ),
      registered: (
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
      {
        label: 'Delete',
        onClick: () => setDeleteModal({ _isOpen: true, users: user }),
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
      <h1 className="wp-heading-inline">Users</h1>
      <Link to="/users/new" className="page-title-action">
        Add New
      </Link>
      <hr className="wp-header-end" />

      {/* Filters */}
      <div className="wp-filter">
        <div className="filter-items">
          <Select value={roleFilter} onValueChange={(value: string) => setRoleFilter(value as UserRole | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as UserStatus | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="search-box">
            <Input
              type="search"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              className="w-[300px]"
            />
            <Button variant="secondary">
              Search Users
            </Button>
          </div>

          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>

          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
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
        loading={isLoading}
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
      {pagination && (
        <div className="tablenav bottom">
          <div className="tablenav-pages">
            <span className="displaying-num">{pagination.totalItems} items</span>
            <span className="pagination-links">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={!pagination.hasPrev}
              >
                ‹ Previous
              </Button>
              
              <span className="paging-input">
                <span className="current-page">{pagination.current}</span> of{' '}
                <span className="total-pages">{pagination.total}</span>
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={!pagination.hasNext}
              >
                Next ›
              </Button>
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="notice notice-error">
          <p>Error loading users. Please try again.</p>
        </div>
      )}

      {/* Modals */}
      {deleteModal._isOpen && (
        <UserDeleteModal
          isOpen={deleteModal._isOpen}
          onClose={() => setDeleteModal({ _isOpen: false, users: [] })}
          users={deleteModal.users}
          onConfirm={(userIds) => deleteMutation.mutate(userIds)}
        />
      )}

      {roleChangeModal._isOpen && (
        <UserRoleChangeModal
          isOpen={roleChangeModal._isOpen}
          onClose={() => setRoleChangeModal({ _isOpen: false, users: [] })}
          users={roleChangeModal.users}
          onConfirm={(userIds, role) => roleChangeMutation.mutate({ userIds, role })}
        />
      )}
    </div>
  );
};

export default UsersList;
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
  Edit,
  Trash2,
  Download,
  UserPlus,
  UserCheck,
  UserX,
  MoreHorizontal
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { UserApi } from '@/api/userApi';
import { User as UserType, UserRole, UserStatus } from '@/types/user';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type SortField = 'name' | 'email' | 'role' | 'createdAt' | null;
type SortOrder = 'asc' | 'desc';

const roleDisplayNames: Record<UserRole, string> = {
  admin: '관리자',
  moderator: '운영자',
  user: '일반 사용자',
  guest: '게스트',
  vendor: '판매자',
  customer: '구매자',
  affiliate: '제휴사',
  partner: '파트너'
};

const statusDisplayNames: Record<UserStatus, { label: string; color: string }> = {
  active: { label: '활성', color: 'bg-green-100 text-green-800' },
  inactive: { label: '비활성', color: 'bg-gray-100 text-gray-800' },
  pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-800' },
  suspended: { label: '정지', color: 'bg-red-100 text-red-800' },
  deleted: { label: '삭제됨', color: 'bg-gray-100 text-gray-600' }
};

const UserListNew = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedBulkAction, setSelectedBulkAction] = useState<string>('');
  const [showScreenOptions, setShowScreenOptions] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Visible columns management
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('users-visible-columns');
    return saved ? JSON.parse(saved) : {
      avatar: true,
      email: true,
      role: true,
      status: true,
      lastLogin: true,
      createdAt: true
    };
  });

  // Items per page management
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('users-items-per-page');
    return saved ? parseInt(saved) : 20;
  });

  // Fetch users with React Query
  const { data: usersData, isLoading, error, refetch } = useQuery({
    queryKey: ['users', page, limit, searchQuery, roleFilter, statusFilter, sortField, sortOrder],
    queryFn: async () => {
      const filters: any = {};
      if (searchQuery) filters.q = searchQuery;
      if (roleFilter !== 'all') filters.role = roleFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (sortField) {
        filters.sortBy = sortField;
        filters.sortOrder = sortOrder;
      }
      
      return await UserApi.getUsers(page, itemsPerPage, filters);
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await UserApi.deleteUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('사용자가 삭제되었습니다.');
    },
    onError: () => {
      toast.error('사용자 삭제에 실패했습니다.');
    }
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: async (data: { action: string; userIds: string[] }) => {
      if (data.action === 'delete') {
        await Promise.all(data.userIds.map(id => UserApi.deleteUser(id)));
      } else if (data.action === 'approve') {
        return await UserApi.bulkAction({
          action: 'approve',
          userIds: data.userIds
        });
      } else if (data.action === 'reject') {
        return await UserApi.bulkAction({
          action: 'reject',
          userIds: data.userIds,
          reason: '관리자에 의한 일괄 거부'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedUsers(new Set());
      setSelectedBulkAction('');
      toast.success('일괄 작업이 완료되었습니다.');
    },
    onError: () => {
      toast.error('일괄 작업에 실패했습니다.');
    }
  });

  // Export users
  const handleExportUsers = async () => {
    try {
      const filters: any = {};
      if (searchQuery) filters.q = searchQuery;
      if (roleFilter !== 'all') filters.role = roleFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      
      const blob = await UserApi.exportUsers(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('사용자 목록을 내보냈습니다.');
    } catch (error) {
      toast.error('내보내기에 실패했습니다.');
    }
  };

  // Handle selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUsers(new Set((usersData?.users || []).map(u => u.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  // Handle bulk actions
  const handleApplyBulkAction = async () => {
    if (!selectedBulkAction) {
      toast.error('작업을 선택해주세요.');
      return;
    }
    
    if (selectedUsers.size === 0) {
      toast.error('사용자를 선택해주세요.');
      return;
    }
    
    if (selectedBulkAction === 'delete') {
      if (confirm(`선택한 ${selectedUsers.size}명의 사용자를 삭제하시겠습니까?`)) {
        await bulkActionMutation.mutateAsync({
          action: 'delete',
          userIds: Array.from(selectedUsers)
        });
      }
    } else {
      await bulkActionMutation.mutateAsync({
        action: selectedBulkAction,
        userIds: Array.from(selectedUsers)
      });
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

  // Handle delete
  const handleDeleteUser = async (userId: string) => {
    if (confirm('정말 이 사용자를 삭제하시겠습니까?')) {
      await deleteUserMutation.mutateAsync(userId);
    }
  };

  // Save preferences
  useEffect(() => {
    localStorage.setItem('users-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('users-items-per-page', itemsPerPage.toString());
    setLimit(itemsPerPage);
  }, [itemsPerPage]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const users = usersData?.users || [];
  const totalPages = usersData ? Math.ceil((usersData.total || 0) / itemsPerPage) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">사용자를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-8 mt-4">
          <p className="text-sm text-red-700">사용자를 불러오는데 실패했습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <div className="flex items-center justify-between">
          <AdminBreadcrumb 
            items={[
              { label: '관리자', path: '/admin' },
              { label: '사용자 관리' }
            ]}
          />
          
          {/* Screen Options */}
          <div className="relative">
            <button
              onClick={() => setShowScreenOptions(!showScreenOptions)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              <Settings className="w-4 h-4" />
              화면 옵션
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showScreenOptions && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-300 rounded-md shadow-lg z-50">
                <div className="p-4">
                  <h3 className="font-medium text-sm mb-3">표시할 열</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries({
                      avatar: '아바타',
                      email: '이메일',
                      role: '역할',
                      status: '상태',
                      lastLogin: '마지막 로그인',
                      createdAt: '가입일'
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center text-sm">
                        <input 
                          type="checkbox" 
                          checked={visibleColumns[key]}
                          onChange={(e) => setVisibleColumns({
                            ...visibleColumns,
                            [key]: e.target.checked
                          })}
                          className="mr-2" 
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  
                  <div className="border-t border-gray-200 mt-3 pt-3">
                    <h3 className="font-medium text-sm mb-3">페이지당 항목</h3>
                    <input
                      type="number"
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(parseInt(e.target.value) || 20)}
                      min="1"
                      max="100"
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Title and Add New */}
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-normal text-gray-900">사용자</h1>
          <button
            onClick={() => navigate('/users/new')}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            새로 추가
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="모든 역할" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 역할</SelectItem>
              {Object.entries(roleDisplayNames).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="모든 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              {Object.entries(statusDisplayNames).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            onClick={() => {
              setRoleFilter('all');
              setStatusFilter('all');
              setSearchQuery('');
            }}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            필터 초기화
          </button>
        </div>

        {/* Search and Bulk Actions */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Select value={selectedBulkAction} onValueChange={setSelectedBulkAction}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="일괄 작업" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approve">승인</SelectItem>
                <SelectItem value="reject">거부</SelectItem>
                <SelectItem value="delete">삭제</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleApplyBulkAction}
              disabled={!selectedBulkAction || selectedUsers.size === 0}
              size="sm"
            >
              적용
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && refetch()}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="사용자 검색..."
            />
            <Button onClick={() => refetch()} size="sm" variant="outline">
              <Search className="w-4 h-4" />
            </Button>
            <Button onClick={handleExportUsers} size="sm" variant="outline">
              <Download className="w-4 h-4 mr-1" />
              내보내기
            </Button>
          </div>
        </div>

        {/* Item count */}
        <div className="text-sm text-gray-600 mb-2">
          {users.length}개 항목
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedUsers.size === users.length && users.length > 0}
                  />
                </th>
                {visibleColumns.avatar && (
                  <th className="w-16 px-3 py-3 text-left">
                    <User className="w-4 h-4 text-gray-700" />
                  </th>
                )}
                <th className="px-3 py-3 text-left">
                  <button 
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                  >
                    이름
                    {sortField === 'name' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                {visibleColumns.email && (
                  <th className="px-3 py-3 text-left">
                    <button 
                      onClick={() => handleSort('email')}
                      className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                    >
                      이메일
                      {sortField === 'email' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                )}
                {visibleColumns.role && (
                  <th className="px-3 py-3 text-left">
                    <button 
                      onClick={() => handleSort('role')}
                      className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                    >
                      역할
                      {sortField === 'role' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">상태</th>
                )}
                {visibleColumns.lastLogin && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">마지막 로그인</th>
                )}
                {visibleColumns.createdAt && (
                  <th className="px-3 py-3 text-left">
                    <button 
                      onClick={() => handleSort('createdAt')}
                      className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                    >
                      가입일
                      {sortField === 'createdAt' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                )}
                <th className="w-10 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                  onMouseEnter={() => {
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                    }
                    hoverTimeoutRef.current = setTimeout(() => {
                      setHoveredRow(user.id);
                    }, 300);
                  }}
                  onMouseLeave={() => {
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    setHoveredRow(null);
                  }}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                    />
                  </td>
                  {visibleColumns.avatar && (
                    <td className="px-3 py-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                    </td>
                  )}
                  <td className="px-3 py-3">
                    <div>
                      <button
                        onClick={() => navigate(`/users/${user.id}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        {user.fullName || user.email}
                      </button>
                      {hoveredRow === user.id && (
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <button
                            onClick={() => navigate(`/users/${user.id}/edit`)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            편집
                          </button>
                          <span className="text-gray-400">|</span>
                          <button
                            onClick={() => navigate(`/users/${user.id}`)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            보기
                          </button>
                          <span className="text-gray-400">|</span>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  {visibleColumns.email && (
                    <td className="px-3 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {user.email}
                      </div>
                    </td>
                  )}
                  {visibleColumns.role && (
                    <td className="px-3 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {roleDisplayNames[user.role as UserRole] || user.role}
                      </Badge>
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-3 py-3">
                      <Badge 
                        className={`text-xs ${statusDisplayNames[user.status as UserStatus]?.color || ''}`}
                      >
                        {statusDisplayNames[user.status as UserStatus]?.label || user.status}
                      </Badge>
                    </td>
                  )}
                  {visibleColumns.lastLogin && (
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : '—'}
                    </td>
                  )}
                  {visibleColumns.createdAt && (
                    <td className="px-3 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                  )}
                  <td className="px-3 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <MoreHorizontal className="w-4 h-4 text-gray-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/users/${user.id}`)}>
                          <User className="w-4 h-4 mr-2" />
                          보기
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/users/${user.id}/edit`)}>
                          <Edit className="w-4 h-4 mr-2" />
                          편집
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">사용자가 없습니다.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              전체 {usersData?.total || 0}명 중 {users.length}명 표시
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                size="sm"
                variant="outline"
              >
                이전
              </Button>
              <span className="text-sm text-gray-600 px-3">
                {page} / {totalPages}
              </span>
              <Button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                size="sm"
                variant="outline"
              >
                다음
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserListNew;
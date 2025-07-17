/**
 * Users List Page - 사용자 목록 조회, 검색, 필터링, 페이지네이션
 * WordPress 스타일 사용자 관리 인터페이스
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  Shield
} from 'lucide-react';

import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import UserDeleteModal from '../../components/users/UserDeleteModal';
import UserRoleChangeModal from '../../components/users/UserRoleChangeModal';
import { User, UserFilters, UserRole, UserStatus, ROLE_LABELS, STATUS_LABELS } from '../../types/user';
import apiClient from '../../api/base';

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
    filters: UserFilters;
  };
  message: string;
}

const UsersList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // 상태 관리
  const [filters, setFilters] = useState<UserFilters>({
    role: 'all',
    status: 'all',
    search: '',
    dateFrom: '',
    dateTo: ''
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // 모달 상태
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    users: User | User[];
  }>({
    isOpen: false,
    users: [] as User[]
  });
  
  const [roleChangeModal, setRoleChangeModal] = useState<{
    isOpen: boolean;
    users: User[];
  }>({
    isOpen: false,
    users: []
  });

  // 사용자 목록 조회
  const {
    data: usersData,
    isLoading,
    error,
    refetch
  } = useQuery<UsersResponse>({
    queryKey: ['users', page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (filters.role && filters.role !== 'all') {
        params.append('role', filters.role);
      }
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo);
      }

      const response = await apiClient.get(`/users?${params}`);
      return response.data;
    },
    staleTime: 30 * 1000, // 30초
  });

  // 필터 핸들러
  const handleFilterChange = (newFilters: Partial<UserFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1); // 첫 페이지로 리셋
  };

  const handleSearch = (searchTerm: string) => {
    handleFilterChange({ search: searchTerm });
  };

  const clearFilters = () => {
    setFilters({
      role: 'all',
      status: 'all',
      search: '',
      dateFrom: '',
      dateTo: ''
    });
    setPage(1);
  };

  // 사용자 삭제 뮤테이션
  const deleteUsersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      if (userIds.length === 1) {
        const response = await apiClient.delete(`/users/${userIds[0]}`);
        return response.data;
      } else {
        const response = await apiClient.delete('/users', { data: { userIds } });
        return response.data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedUsers([]);
      setDeleteModal({ isOpen: false, users: [] as User[] });
      
      toast.success(
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          {data.message || '사용자가 성공적으로 삭제되었습니다.'}
        </div>
      );
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : '사용자 삭제 중 오류가 발생했습니다.';
      toast.error(
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          {message}
        </div>
      );
    }
  });

  // 사용자 역할 변경 뮤테이션
  const changeUserRolesMutation = useMutation({
    mutationFn: async ({ userIds, newRole }: { userIds: string[]; newRole: UserRole }) => {
      const response = await apiClient.put('/users/roles', { userIds, role: newRole });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedUsers([]);
      setRoleChangeModal({ isOpen: false, users: [] });
      
      toast.success(
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          {data.message || '사용자 역할이 성공적으로 변경되었습니다.'}
        </div>
      );
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : '역할 변경 중 오류가 발생했습니다.';
      toast.error(
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          {message}
        </div>
      );
    }
  });

  // 상태별 아이콘 매핑
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'suspended':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  // 역할별 배지 색상
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'business':
        return 'bg-blue-100 text-blue-800';
      case 'affiliate':
        return 'bg-green-100 text-green-800';
      case 'customer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // 테이블 컬럼 정의
  const columns = useMemo(() => [
    {
      id: 'select',
      label: '',
      accessor: (user: User) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={selectedUsers.includes(user.id)}
          onChange={(e) => handleSelectUser(user.id, e.target.checked)}
        />
      ),
      width: '50px',
      align: 'center' as const
    },
    {
      id: 'user',
      label: '사용자',
      accessor: (user: User) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            {user.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="w-8 h-8 rounded-full" />
            ) : (
              <span className="text-sm font-medium text-gray-600">
                {user.name.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      ),
      sortable: true
    },
    {
      id: 'role',
      label: '역할',
      accessor: (user: User) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
          {ROLE_LABELS[user.role]}
        </span>
      ),
      width: '100px'
    },
    {
      id: 'status',
      label: '상태',
      accessor: (user: User) => (
        <div className="flex items-center space-x-2">
          {getStatusIcon(user.status)}
          <span className="text-sm text-gray-900">
            {STATUS_LABELS[user.status]}
          </span>
        </div>
      ),
      width: '120px'
    },
    {
      id: 'businessInfo',
      label: '사업자 정보',
      accessor: (user: User) => (
        user.businessInfo ? (
          <div>
            <div className="text-sm font-medium text-gray-900">
              {user.businessInfo.businessName}
            </div>
            <div className="text-xs text-gray-500">
              {user.businessInfo.businessType}
            </div>
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )
      ),
      width: '150px'
    },
    {
      id: 'createdAt',
      label: '가입일',
      accessor: (user: User) => (
        <div className="text-sm text-gray-900">
          {new Date(user.createdAt).toLocaleDateString('ko-KR')}
        </div>
      ),
      sortable: true,
      width: '120px'
    },
    {
      id: 'lastLoginAt',
      label: '최종 로그인',
      accessor: (user: User) => (
        <div className="text-sm text-gray-900">
          {user.lastLoginAt ? 
            new Date(user.lastLoginAt).toLocaleDateString('ko-KR') : 
            <span className="text-gray-400">-</span>
          }
        </div>
      ),
      width: '120px'
    },
    {
      id: 'actions',
      label: '작업',
      accessor: (user: User) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate(`/users/${user.id}`)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="사용자 상세"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/users/${user.id}/edit`)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="사용자 수정"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSingleUserDelete(user)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="사용자 삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="더 보기"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      ),
      width: '120px'
    }
  ], [navigate]);

  // 핸들러 함수들
  const handleSingleUserDelete = (user: User) => {
    setDeleteModal({
      isOpen: true,
      users: user
    });
  };

  const handleBulkDelete = () => {
    const usersToDelete = usersData?.data.users.filter(user => 
      selectedUsers.includes(user.id)
    ) || [];
    
    if (usersToDelete.length > 0) {
      setDeleteModal({
        isOpen: true,
        users: usersToDelete
      });
    }
  };

  const handleBulkRoleChange = () => {
    const usersToChange = usersData?.data.users.filter(user => 
      selectedUsers.includes(user.id)
    ) || [];
    
    if (usersToChange.length > 0) {
      setRoleChangeModal({
        isOpen: true,
        users: usersToChange
      });
    }
  };

  const handleDeleteConfirm = () => {
    const users = Array.isArray(deleteModal.users) ? deleteModal.users : [deleteModal.users];
    const userIds = users.map(user => user.id);
    deleteUsersMutation.mutate(userIds);
  };

  const handleRoleChangeConfirm = (newRole: UserRole) => {
    changeUserRolesMutation.mutate({
      userIds: selectedUsers,
      newRole
    });
  };

  const handleSelectUser = (userId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected && usersData?.data.users) {
      setSelectedUsers(usersData.data.users.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              사용자 데이터 로드 실패
            </h3>
            <p className="text-gray-600 mb-4">
              사용자 목록을 불러오는 중 오류가 발생했습니다.
            </p>
            <button
              onClick={() => refetch()}
              className="wp-button wp-button-primary"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              다시 시도
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <PageHeader
          title="사용자 관리"
          subtitle="플랫폼 사용자들을 관리하고 모니터링합니다"
          actions={[
            {
              id: 'add-user',
              label: '새 사용자 추가',
              icon: <Plus className="w-4 h-4" />,
              onClick: () => navigate('/users/new'),
              variant: 'primary'
            }
          ]}
        />

        {/* 필터 및 검색 */}
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* 검색 */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="사용자 이름 또는 이메일 검색..."
                    className="wp-input-field pl-10"
                    value={filters.search}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* 필터 */}
              <div className="flex items-center space-x-4">
                <select
                  value={filters.role}
                  onChange={(e) => handleFilterChange({ role: e.target.value as UserRole | 'all' })}
                  className="wp-input-field"
                >
                  <option value="all">모든 역할</option>
                  <option value="admin">관리자</option>
                  <option value="business">사업자</option>
                  <option value="affiliate">파트너</option>
                  <option value="customer">일반회원</option>
                </select>

                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange({ status: e.target.value as UserStatus | 'all' })}
                  className="wp-input-field"
                >
                  <option value="all">모든 상태</option>
                  <option value="approved">승인됨</option>
                  <option value="pending">승인대기</option>
                  <option value="rejected">거부됨</option>
                  <option value="suspended">정지됨</option>
                </select>

                <button
                  onClick={clearFilters}
                  className="wp-button wp-button-secondary"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  필터 초기화
                </button>

                <button
                  onClick={() => refetch()}
                  className="wp-button wp-button-secondary"
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 선택된 사용자 일괄 작업 */}
        {selectedUsers.length > 0 && (
          <div className="wp-card border-blue-200 bg-blue-50">
            <div className="wp-card-body">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedUsers.length}명의 사용자가 선택됨
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleBulkRoleChange}
                    className="wp-button wp-button-secondary wp-button-sm"
                    disabled={changeUserRolesMutation.isPending}
                  >
                    <Shield className="w-4 h-4 mr-1" />
                    역할 변경
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="wp-button wp-button-danger wp-button-sm"
                    disabled={deleteUsersMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    일괄 삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 통계 요약 */}
        {usersData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="wp-card">
              <div className="wp-card-body text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {usersData.data.pagination.totalItems}
                </div>
                <div className="text-sm text-gray-600">전체 사용자</div>
              </div>
            </div>
            <div className="wp-card">
              <div className="wp-card-body text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {usersData.data.users.filter(u => u.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">승인 대기</div>
              </div>
            </div>
            <div className="wp-card">
              <div className="wp-card-body text-center">
                <div className="text-2xl font-bold text-green-600">
                  {usersData.data.users.filter(u => u.status === 'approved').length}
                </div>
                <div className="text-sm text-gray-600">승인됨</div>
              </div>
            </div>
            <div className="wp-card">
              <div className="wp-card-body text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {usersData.data.users.filter(u => u.role === 'business').length}
                </div>
                <div className="text-sm text-gray-600">사업자</div>
              </div>
            </div>
          </div>
        )}

        {/* 사용자 테이블 */}
        <div className="wp-card">
          <div className="wp-card-body">
            {/* 테이블 헤더 with 전체 선택 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={selectedUsers.length > 0 && usersData?.data.users && selectedUsers.length === usersData.data.users.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                <span className="text-sm text-gray-600">
                  전체 선택 ({usersData?.data.users?.length || 0}명)
                </span>
              </div>
            </div>
            <DataTable
              data={usersData?.data.users || []}
              columns={columns}
              loading={isLoading}
              pagination={{
                page: usersData?.data.pagination.current || 1,
                total: usersData?.data.pagination.total || 1,
                pageSize: limit,
                onPageChange: setPage,
                onPageSizeChange: () => {} // TODO: implement page size change
              }}
              emptyMessage="조건에 맞는 사용자가 없습니다."
            />
          </div>
        </div>

        {/* 내보내기 및 추가 액션 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {usersData?.data.pagination.totalItems || 0}명 중{' '}
            {usersData?.data.pagination.count || 0}명 표시
          </div>
          <div className="flex items-center space-x-2">
            <button className="wp-button wp-button-secondary wp-button-sm">
              <Download className="w-4 h-4 mr-2" />
              CSV 내보내기
            </button>
          </div>
        </div>
      </div>

      {/* 사용자 삭제 모달 */}
      <UserDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, users: [] as User[] })}
        onConfirm={handleDeleteConfirm}
        users={deleteModal.users}
        isLoading={deleteUsersMutation.isPending}
      />

      {/* 사용자 역할 변경 모달 */}
      <UserRoleChangeModal
        isOpen={roleChangeModal.isOpen}
        onClose={() => setRoleChangeModal({ isOpen: false, users: [] })}
        onConfirm={handleRoleChangeConfirm}
        users={roleChangeModal.users}
        isLoading={changeUserRolesMutation.isPending}
      />
    </AdminLayout>
  );
};

export default UsersList;
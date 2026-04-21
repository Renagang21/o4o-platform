/**
 * Active Users Page
 *
 * WO-O4O-TABLE-DATATABLE-DEPRECATION-V1B — BaseTable 직접 사용으로 마이그레이션
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users as UsersIcon, Clock, RefreshCw } from 'lucide-react';
import { UserApi } from '@/api/userApi';
import toast from 'react-hot-toast';
import type { User } from '@/types/user';
import PageHeader from '../../components/common/PageHeader';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';

export default function ActiveUsers() {
  const navigate = useNavigate();
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveUsers();
  }, []);

  const fetchActiveUsers = async () => {
    try {
      setLoading(true);
      const response = await UserApi.getUsers();
      const users = (response as any).data || response || [];
      setActiveUsers(users);
    } catch (error: any) {
      toast.error('접속자 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800',
      vendor: 'bg-blue-100 text-blue-800',
      seller: 'bg-green-100 text-green-800',
      customer: 'bg-gray-100 text-gray-800',
      supplier: 'bg-orange-100 text-orange-800',
      partner: 'bg-pink-100 text-pink-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: '최고 관리자',
      admin: '관리자',
      vendor: '공급자',
      seller: '판매자',
      customer: '고객',
      supplier: '공급자',
      partner: '파트너',
    };
    return labels[role] || role;
  };

  const formatLastLogin = (lastLoginAt?: string) => {
    if (!lastLoginAt) return '로그인 기록 없음';
    const lastLogin = new Date(lastLoginAt);
    const now = new Date();
    const diffMs = now.getTime() - lastLogin.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${diffDays}일 전`;
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    const statusLabels: Record<string, string> = {
      active: '활성',
      pending: '대기',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const columns: O4OColumn<User>[] = [
    {
      key: 'name',
      header: '이름',
      sortable: true,
      sortAccessor: (row) => (row as any).name || '',
      render: (_, row) => <span className="font-medium">{(row as any).name || '이름 없음'}</span>,
    },
    {
      key: 'email',
      header: '이메일',
      sortable: true,
      sortAccessor: (row) => (row as any).email || '',
      render: (_, row) => <span className="text-gray-600">{(row as any).email}</span>,
    },
    {
      key: 'role',
      header: '역할',
      align: 'center',
      render: (_, row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor((row as any).role)}`}>
          {getRoleLabel((row as any).role)}
        </span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      render: (_, row) => getStatusBadge((row as any).status),
    },
    {
      key: 'lastLoginAt',
      header: '마지막 접속',
      render: (_, row) => (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          {formatLastLogin((row as any).lastLoginAt)}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="현재 접속자"
        subtitle="최근 활동한 사용자 목록"
        actions={[
          {
            id: 'refresh',
            label: '새로고침',
            icon: <RefreshCw className="w-4 h-4" />,
            onClick: fetchActiveUsers,
            variant: 'secondary' as const,
          },
        ]}
      />

      {/* Stats */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <UsersIcon className="w-4 h-4" />
          <span>총 {activeUsers.length}명</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="animate-pulse p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
          </div>
        ) : (
          <BaseTable<User>
            columns={columns}
            data={activeUsers}
            rowKey={(row) => (row as any).id}
            emptyMessage="현재 접속 중인 사용자가 없습니다"
            onRowClick={(row) => navigate(`/users/${(row as any).id}`)}
            tableId="active-users"
            columnVisibility
            persistState
          />
        )}
      </div>
    </div>
  );
}

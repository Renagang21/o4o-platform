/**
 * Active Users Page
 *
 * Refactored: PageHeader + DataTable pattern applied
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Users as UsersIcon, Clock, RefreshCw, Settings } from 'lucide-react';
import { UserApi } from '@/api/userApi';
import toast from 'react-hot-toast';
import type { User } from '@/types/user';
import PageHeader from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';

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

  // DataTable column definitions
  const columns: Column<User>[] = [
    {
      key: 'name',
      title: '이름',
      dataIndex: 'name',
      render: (value: string) => (
        <span className="font-medium">{value || '이름 없음'}</span>
      ),
    },
    {
      key: 'email',
      title: '이메일',
      dataIndex: 'email',
      render: (value: string) => (
        <span className="text-gray-600">{value}</span>
      ),
    },
    {
      key: 'role',
      title: '역할',
      dataIndex: 'role',
      align: 'center',
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(value)}`}>
          {getRoleLabel(value)}
        </span>
      ),
    },
    {
      key: 'status',
      title: '상태',
      dataIndex: 'status',
      align: 'center',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'lastLoginAt',
      title: '마지막 접속',
      dataIndex: 'lastLoginAt',
      render: (value: string) => (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          {formatLastLogin(value)}
        </div>
      ),
    },
  ];

  // PageHeader actions
  const headerActions = [
    {
      id: 'screen-options',
      label: 'Screen Options',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => {
        console.log('Screen options clicked');
      },
      variant: 'secondary' as const,
    },
    {
      id: 'refresh',
      label: '새로고침',
      icon: <RefreshCw className="w-4 h-4" />,
      onClick: fetchActiveUsers,
      variant: 'secondary' as const,
    },
  ];

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="현재 접속자"
        subtitle="최근 활동한 사용자 목록"
        actions={headerActions}
      />

      {/* Stats */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <UsersIcon className="w-4 h-4" />
          <span>총 {activeUsers.length}명</span>
        </div>
      </div>

      {/* Users DataTable */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable<User>
          columns={columns}
          dataSource={activeUsers}
          rowKey="id"
          loading={loading}
          emptyText="현재 접속 중인 사용자가 없습니다"
          onRowClick={(record) => navigate(`/users/${record.id}`)}
        />
      </div>
    </div>
  );
}

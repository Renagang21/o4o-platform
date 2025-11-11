import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Users as UsersIcon, Clock } from 'lucide-react';
import { UserApi } from '@/api/userApi';
import toast from 'react-hot-toast';
import type { User } from '@/types/user';

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
      // TODO: API endpoint for active users
      // For now, fetch all users and filter by recent activity
      const response = await UserApi.getUsers();
      const users = (response as any).data || response || [];

      // Filter users who logged in within last 24 hours
      // const activeUsers = users.filter((user: User) => {
      //   if (!user.lastLoginAt) return false;
      //   const lastLogin = new Date(user.lastLoginAt);
      //   const now = new Date();
      //   const hoursDiff = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60);
      //   return hoursDiff <= 24;
      // });

      // For now, show all users
      setActiveUsers(users);
    } catch (error: any) {
      toast.error('접속자 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-purple-500',
      admin: 'bg-red-500',
      vendor: 'bg-blue-500',
      seller: 'bg-green-500',
      customer: 'bg-gray-500',
      supplier: 'bg-orange-500',
      partner: 'bg-pink-500',
    };
    return colors[role] || 'bg-gray-500';
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-500" />
            현재 접속자
          </h1>
          <p className="text-gray-500 mt-1">최근 활동한 사용자 목록</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <UsersIcon className="w-4 h-4" />
          <span>총 {activeUsers.length}명</span>
        </div>
      </div>

      {/* Active Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>사용자 목록</CardTitle>
          <CardDescription>
            클릭하여 상세 정보를 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>현재 접속 중인 사용자가 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">이름</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">이메일</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">역할</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">상태</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">마지막 접속</th>
                  </tr>
                </thead>
                <tbody>
                  {activeUsers.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => navigate(`/users/${user.id}`)}
                      className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium">{user.name || '이름 없음'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-600">{user.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`${getRoleBadgeColor(user.role)} text-white`}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={
                            user.status === 'active'
                              ? 'bg-green-500 text-white'
                              : user.status === 'pending'
                              ? 'bg-yellow-500 text-white'
                              : 'bg-gray-500 text-white'
                          }
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {formatLastLogin(user.lastLoginAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

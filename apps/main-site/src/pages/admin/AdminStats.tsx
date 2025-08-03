import { useState, useEffect, FC } from 'react';
import RoleProtectedRoute from '../../components/RoleProtectedRoute';

// Mock 데이터 예시
const mockAccessLogs = [
  { userId: '1', page: '/admin/user-role-manager', timestamp: 1710000000000 },
  { userId: '2', page: '/admin/user-role-manager', timestamp: 1710000001000 },
  { userId: '1', page: '/admin/stats', timestamp: 1710000002000 },
  { userId: '3', page: '/admin/stats', timestamp: 1710000003000 },
  { userId: '2', page: '/admin/stats', timestamp: 1710000004000 },
  { userId: '1', page: '/admin/user-role-manager', timestamp: 1710000005000 },
];
const mockRoleHistory = [
  { adminId: '1', targetUserId: '2', newRoles: ['user', 'seller'], timestamp: 1710000000000 },
  { adminId: '1', targetUserId: '3', newRoles: ['user', 'partner'], timestamp: 1710000001000 },
  { adminId: '2', targetUserId: '4', newRoles: ['user', 'contributor'], timestamp: 1710000002000 },
];

const AdminStats: FC = () => {
  // 페이지별 접근 수 집계
  const pageCounts = mockAccessLogs.reduce((acc: any, log: any) => {
    acc[log.page] = (acc[log.page] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 역할 변경 이력 집계 (targetUserId별 변경 횟수)
  const roleChangeCounts = mockRoleHistory.reduce((acc: any, log: any) => {
    acc[log.targetUserId] = (acc[log.targetUserId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-4xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-8">관리자 대시보드 통계</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">페이지별 접근 수</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">페이지</th>
                <th className="text-right py-2">접근 수</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(pageCounts).map(([page, count]) => (
                <tr key={page} className="border-b">
                  <td className="py-2">{page}</td>
                  <td className="text-right py-2">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">역할 변경 이력 (유저별)</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">사용자 ID</th>
                <th className="text-right py-2">변경 횟수</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(roleChangeCounts).map(([userId, count]) => (
                <tr key={userId} className="border-b">
                  <td className="py-2">User {userId}</td>
                  <td className="text-right py-2">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminStats; 
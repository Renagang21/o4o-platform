import { useState, useEffect, FC } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import RoleProtectedRoute from '../../components/RoleProtectedRoute';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

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

const AdminStats: React.FC = () => {
  // 페이지별 접근 수 집계
  const pageCounts = mockAccessLogs.reduce((acc, log) => {
    acc[log.page] = (acc[log.page] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 역할 변경 이력 집계 (targetUserId별 변경 횟수)
  const roleChangeCounts = mockRoleHistory.reduce((acc, log) => {
    acc[log.targetUserId] = (acc[log.targetUserId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 차트 데이터
  const pageBarData = {
    labels: Object.keys(pageCounts),
    datasets: [
      {
        label: '페이지별 접근 수',
        data: Object.values(pageCounts),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
    ],
  };

  const rolePieData = {
    labels: Object.keys(roleChangeCounts),
    datasets: [
      {
        label: '역할 변경 이력',
        data: Object.values(roleChangeCounts),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
        ],
      },
    ],
  };

  return (
    <div className="max-w-4xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-8">관리자 대시보드 통계</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">페이지별 접근 수</h2>
          <Bar data={pageBarData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">역할 변경 이력 (유저별)</h2>
          <Pie data={rolePieData} options={{ responsive: true }} />
        </div>
      </div>
    </div>
  );
};

export default AdminStats; 
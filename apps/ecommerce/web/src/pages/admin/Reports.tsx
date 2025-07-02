import React, { useEffect } from 'react';
import { useAdminReportStore } from '../../store/adminReportStore';
import { AdminRoleProtectedRoute } from '../../components/AdminProtectedRoute';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';

const roleOptions = [
  { value: 'all', label: '전체' },
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'manager', label: 'Manager' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];
const periodOptions = [
  { value: 'week', label: '주간' },
  { value: 'month', label: '월간' },
];

const AdminReports: React.FC = () => {
  const { fetchLogs, loading, error, filters, setRoleFilter, setPeriodFilter, getStats } = useAdminReportStore();
  useEffect(() => { fetchLogs(); }, []);
  const stats = getStats();

  return (
    <AdminRoleProtectedRoute roles={['superadmin', 'manager']}>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">운영자 활동 리포트</h1>
        <div className="flex gap-4 mb-6 flex-wrap">
          <select value={filters.role} onChange={e => setRoleFilter(e.target.value)} className="border rounded px-3 py-2">
            {roleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select value={filters.period} onChange={e => setPeriodFilter(e.target.value as any)} className="border rounded px-3 py-2">
            {periodOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">로딩 중...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded shadow p-6 flex flex-col items-center">
                <div className="text-lg font-semibold mb-2">관리자별 작업 건수</div>
                <ul className="w-full">
                  {Object.entries(stats.byAdmin).map(([email, count]) => (
                    <li key={email} className="flex justify-between py-1 border-b last:border-b-0">
                      <span>{email}</span>
                      <span className="font-bold text-blue-700">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded shadow p-6 flex flex-col items-center">
                <div className="text-lg font-semibold mb-2">역할별 작업 건수</div>
                <ul className="w-full">
                  {Object.entries(stats.byRole).map(([role, count]) => (
                    <li key={role} className="flex justify-between py-1 border-b last:border-b-0">
                      <span>{role}</span>
                      <span className="font-bold text-green-700">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded shadow p-6 flex flex-col items-center">
                <div className="text-lg font-semibold mb-2">기간별 작업 추이</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded shadow p-6">
              <div className="font-bold mb-2">기간별 작업 라인 차트</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats.trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#059669" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </AdminRoleProtectedRoute>
  );
};

export default AdminReports; 
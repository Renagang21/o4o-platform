import React, { useEffect } from 'react';
import { useAdminMonitorStore } from '../../store/adminMonitorStore';
import { AdminRoleProtectedRoute } from '../../components/AdminProtectedRoute';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const errorColors = ['#f87171', '#fbbf24'];

const SystemMonitor: React.FC = () => {
  const { status, loading, error, fetchStatus } = useAdminMonitorStore();
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const errorData = [
    { name: '4xx', value: status?.errorSummary['4xx'] || 0 },
    { name: '5xx', value: status?.errorSummary['5xx'] || 0 },
  ];
  const requestData = [
    { name: '1분', value: status?.requestCounts['1m'] || 0 },
    { name: '10분', value: status?.requestCounts['10m'] || 0 },
    { name: '1시간', value: status?.requestCounts['1h'] || 0 },
  ];

  return (
    <AdminRoleProtectedRoute roles={['superadmin']}>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">시스템 운영 상태 모니터링</h1>
        {loading ? (
          <div className="p-8 text-center text-gray-400">로딩 중...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : status && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded shadow p-6 flex flex-col items-center">
                <div className="text-lg font-semibold mb-2">서버 상태</div>
                <div className={`text-xl font-bold ${status.server === 'up' ? 'text-green-600' : 'text-red-600'}`}>{status.server === 'up' ? '정상' : '오프라인'}</div>
              </div>
              <div className="bg-white rounded shadow p-6 flex flex-col items-center">
                <div className="text-lg font-semibold mb-2">응답 속도</div>
                <div className="text-xl font-bold text-blue-700">{status.responseTime} ms</div>
              </div>
              <div className="bg-white rounded shadow p-6 flex flex-col items-center">
                <div className="text-lg font-semibold mb-2">DB 상태</div>
                <div className={`text-xl font-bold ${status.dbStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>{status.dbStatus === 'connected' ? '연결됨' : '끊김'}</div>
              </div>
              <div className="bg-white rounded shadow p-6 flex flex-col items-center">
                <div className="text-lg font-semibold mb-2">활성 관리자 수</div>
                <div className="text-xl font-bold text-purple-700">{status.activeAdmins}</div>
              </div>
              <div className="bg-white rounded shadow p-6 flex flex-col items-center col-span-2 md:col-span-1">
                <div className="font-semibold mb-2">요청 수 (1분/10분/1시간)</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={requestData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded shadow p-6 flex flex-col items-center col-span-2 md:col-span-1">
                <div className="font-semibold mb-2">에러 비율 (4xx/5xx)</div>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={errorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={40} label>
                      {errorData.map((entry, i) => <Cell key={i} fill={errorColors[i]} />)}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded shadow p-6 mt-8">
              <div className="font-bold mb-2">최근 에러 로그</div>
              <ul className="divide-y">
                {status.recentErrors && status.recentErrors.length > 0 ? status.recentErrors.map((err, i) => (
                  <li key={i} className="py-2 flex flex-col md:flex-row md:items-center md:gap-4">
                    <span className="text-xs text-gray-400 mr-2">{err.time}</span>
                    <span className="text-red-600 font-semibold mr-2">[{err.code}]</span>
                    <span>{err.message}</span>
                  </li>
                )) : <li className="py-2 text-gray-400">최근 에러 없음</li>}
              </ul>
            </div>
          </>
        )}
      </div>
    </AdminRoleProtectedRoute>
  );
};

export default SystemMonitor; 
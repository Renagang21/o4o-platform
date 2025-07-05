import { AdminRoleProtectedRoute } from '../../components/AdminProtectedRoute';
import React, { useEffect, useState } from 'react';

interface Log {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  target: string;
  detail: string;
}

const actionOptions = ['전체', '상품 등록', '상품 수정', '상품 삭제', '주문 상태 변경', '회원 차단', '권한 변경', '회원 삭제', '로그인', '로그아웃', '설정 변경'];

const AdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('전체');
  const [date, setDate] = useState('');

  useEffect(() => {
    // 실제 구현 시 fetch('/admin/logs')
    fetch('/admin/logs')
      .then(res => res.json())
      .then(data => setLogs(data));
  }, []);

  const filtered = logs.filter(log =>
    (action === '전체' || log.action === action) &&
    (!date || log.timestamp.startsWith(date)) &&
    (log.adminEmail.includes(search) || log.action.includes(search) || log.target.includes(search) || log.detail.includes(search))
  );

  return (
    <AdminRoleProtectedRoute roles={['superadmin']}>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">감사 로그</h1>
        <div className="flex gap-4 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="검색 (관리자, 작업, 대상, 상세)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-3 py-2 w-64"
          />
          <select value={action} onChange={e => setAction(e.target.value)} className="border rounded px-3 py-2">
            {actionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow">
            <thead>
              <tr>
                <th className="px-4 py-2 border-b">시간</th>
                <th className="px-4 py-2 border-b">관리자</th>
                <th className="px-4 py-2 border-b">작업</th>
                <th className="px-4 py-2 border-b">대상</th>
                <th className="px-4 py-2 border-b">상세</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.id}>
                  <td className="px-4 py-2 border-b whitespace-nowrap">{log.timestamp.replace('T', ' ').slice(0, 19)}</td>
                  <td className="px-4 py-2 border-b">{log.adminEmail}</td>
                  <td className="px-4 py-2 border-b">{log.action}</td>
                  <td className="px-4 py-2 border-b">{log.target}</td>
                  <td className="px-4 py-2 border-b">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminRoleProtectedRoute>
  );
};

export default AdminLogs; 
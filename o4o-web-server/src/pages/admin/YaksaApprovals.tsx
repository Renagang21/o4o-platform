import React, { useState } from 'react';
import RoleProtectedRoute from '../../components/RoleProtectedRoute';

interface YaksaUser {
  id: string;
  name: string;
  email: string;
  licenseNumber: string;
  phone: string;
  yaksaStatus: 'pending' | 'approved' | 'rejected';
  role: 'b2c' | 'yaksa';
}

const initialUsers: YaksaUser[] = [
  {
    id: '1',
    name: '홍길동',
    email: 'yaksa1@yaksa.site',
    licenseNumber: 'PH123456',
    phone: '010-1234-5678',
    yaksaStatus: 'pending',
    role: 'b2c',
  },
  {
    id: '2',
    name: '이약사',
    email: 'yaksa2@yaksa.site',
    licenseNumber: 'PH654321',
    phone: '010-8765-4321',
    yaksaStatus: 'pending',
    role: 'b2c',
  },
];

const YaksaApprovals: React.FC = () => {
  const [users, setUsers] = useState<YaksaUser[]>(initialUsers);
  const [message, setMessage] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    setUsers(users => users.map(u => u.id === id ? { ...u, yaksaStatus: 'approved', role: 'yaksa' } : u));
    setMessage('승인 완료되었습니다.');
    setTimeout(() => setMessage(null), 1500);
  };
  const handleReject = (id: string) => {
    setUsers(users => users.filter(u => u.id !== id));
    setMessage('거절 처리되었습니다.');
    setTimeout(() => setMessage(null), 1500);
  };

  return (
    <RoleProtectedRoute roles={['superadmin']}>
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">약사 회원 승인 대시보드</h1>
        {message && <div className="mb-4 text-green-600 font-semibold">{message}</div>}
        <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-3 text-left">이름</th>
                <th className="py-2 px-3 text-left">이메일</th>
                <th className="py-2 px-3 text-left">면허번호</th>
                <th className="py-2 px-3 text-left">전화번호</th>
                <th className="py-2 px-3 text-left">상태</th>
                <th className="py-2 px-3 text-left">액션</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-gray-400">대기 중인 약사 회원이 없습니다.</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="border-b">
                  <td className="py-2 px-3">{user.name}</td>
                  <td className="py-2 px-3">{user.email}</td>
                  <td className="py-2 px-3">{user.licenseNumber}</td>
                  <td className="py-2 px-3">{user.phone}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-1 rounded text-yellow-600 bg-yellow-100">{user.yaksaStatus === 'pending' ? '대기' : user.yaksaStatus}</span>
                  </td>
                  <td className="py-2 px-3 flex gap-2">
                    <button onClick={() => handleApprove(user.id)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">승인</button>
                    <button onClick={() => handleReject(user.id)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">거절</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RoleProtectedRoute>
  );
};

export default YaksaApprovals; 
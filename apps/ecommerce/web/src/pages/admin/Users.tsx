import React, { useEffect, useState } from 'react';
import { useAdminAuthStore, logAdminAction } from '../../store/adminAuthStore';

interface User {
  id: string;
  email: string;
  name: string;
  status: string;
  roles: string[];
}

const mockUsers: User[] = [
  { id: '1', email: 'user1@email.com', name: '홍길동', status: '정상', roles: ['viewer'] },
  { id: '2', email: 'user2@email.com', name: '김철수', status: '정상', roles: ['manager'] },
  { id: '3', email: 'admin@email.com', name: '관리자', status: '정상', roles: ['superadmin'] },
];

const roleOptions = [
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'manager', label: 'Manager' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const { admin } = useAdminAuthStore();

  useEffect(() => {
    // 실제 구현 시 fetch('/admin/customers', { headers: ... })
    setUsers(mockUsers);
  }, []);

  const handleBlock = (id: string) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, status: '차단' } : u)));
    const user = users.find(u => u.id === id);
    if (user) logAdminAction('회원 차단', user.email, `${user.name} 차단`);
  };
  const handleDelete = (id: string) => {
    const user = users.find(u => u.id === id);
    setUsers(users.filter((u) => u.id !== id));
    if (user) logAdminAction('회원 삭제', user.email, `${user.name} 삭제`);
  };
  const handleRoleChange = (id: string, role: User['roles'][number]) => {
    const user = users.find(u => u.id === id);
    if (user && !user.roles.includes(role)) {
      logAdminAction('권한 변경', user.email, `권한 변경: ${user.roles[0]}→${role}`);
    }
    setUsers(users.map((u) => (u.id === id ? { ...u, roles: [role] } : u)));
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">사용자 관리</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead>
            <tr>
              <th className="px-4 py-2 border-b">이메일</th>
              <th className="px-4 py-2 border-b">이름</th>
              <th className="px-4 py-2 border-b">상태</th>
              <th className="px-4 py-2 border-b">권한</th>
              <th className="px-4 py-2 border-b">관리</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-2 border-b">{user.email}</td>
                <td className="px-4 py-2 border-b">{user.name}</td>
                <td className="px-4 py-2 border-b">{user.status}</td>
                <td className="px-4 py-2 border-b">
                  {admin?.roles.includes('superadmin') ? (
                    <select
                      className="border rounded px-2 py-1"
                      value={user.roles[0]}
                      onChange={e => handleRoleChange(user.id, e.target.value as User['roles'][number])}
                      disabled={user.id === admin.id}
                    >
                      {roleOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-bold text-blue-700">{user.roles[0]}</span>
                  )}
                </td>
                <td className="px-4 py-2 border-b flex gap-2">
                  {user.status !== '차단' && (
                    <button
                      className="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500"
                      onClick={() => handleBlock(user.id)}
                    >
                      차단
                    </button>
                  )}
                  <button
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    onClick={() => handleDelete(user.id)}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers; 
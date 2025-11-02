import { useState, useMemo, FC } from 'react';
import { useUserRoleManager, UserRole } from './UserRoleManagerContext';
import toast from 'react-hot-toast';
import { logRoleChange } from '../../utils/logRoleChange';
import { authClient } from '@o4o/auth-client';

const roleLabels: Record<UserRole, string> = {
  user: '방문자',
  member: '일반회원',
  contributor: '기여자',
  seller: '판매자',
  vendor: '공급자',
  partner: '제휴사',
  operator: '운영자',
  administrator: '최고관리자',
};

const ALL_ROLES: UserRole[] = [
  'user', 'member', 'contributor', 'seller', 'vendor', 'partner', 'operator', 'administrator',
];

const UserRoleManager: FC = () => {
  const { users, changeRoles, filter, setFilter, search, setSearch, adminId } = useUserRoleManager();
  const [pendingRoles, setPendingRoles] = useState<{ [id: string]: UserRole[] }>({});

  // 필터/검색 적용된 사용자 목록
  const filteredUsers = useMemo(() => {
    return users.filter((user: any) => {
      const matchesFilter = filter === 'all' ? true : user.roles.includes(filter);
      const matchesSearch =
        user.name.includes(search) ||
        user.email.includes(search) ||
        user.phone.includes(search);
      return matchesFilter && matchesSearch;
    });
  }, [users, filter, search]);

  const handleRoleChange = (id: string, role: UserRole, checked: boolean) => {
    setPendingRoles((prev: any) => {
      const current = prev[id] ?? users.find((u: any) => u.id === id)?.roles ?? [];
      if (checked) {
        return { ...prev, [id]: Array.from(new Set([...current, role])) };
      } else {
        return { ...prev, [id]: current.filter((r: any) => r !== role) };
      }
    });
  };

  const handleSave = async (id: string) => {
    if (pendingRoles[id]) {
      try {
        // 서버에 PUT 요청
        await authClient.api.put(`/users/${id}`, { roles: pendingRoles[id] });
        // 역할 변경 이력 기록
        await logRoleChange(adminId, id, pendingRoles[id]);
        changeRoles(id, pendingRoles[id]);
        toast.success('역할이 변경되었습니다.');
        setPendingRoles((prev: any) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      } catch (e: any) {
        toast.error(e.response?.data?.message || '서버 저장에 실패했습니다.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">회원 역할 관리</h1>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="이름, 이메일, 전화번호 검색"
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            className="px-3 py-2 border rounded w-64 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={filter}
            onChange={(e: any) => setFilter(e.target.value as UserRole | 'all')}
            className="px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
          >
            <option value="all">전체</option>
            {ALL_ROLES.map((role: any) => (
              <option key={role} value={role}>{roleLabels[role]}</option>
            ))}
          </select>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">이름</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">이메일</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">전화번호</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">현재 역할</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">역할 변경</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user: any) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-300">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-300">{user.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-200">{user.roles.map((r: any) => roleLabels[r]).join(', ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.id === adminId ? (
                      <span className="text-gray-400 text-xs">본인</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {ALL_ROLES.map((role: any) => (
                          <label key={role} className="inline-flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={(pendingRoles[user.id] ?? user.roles).includes(role)}
                              onChange={(e: any) => handleRoleChange(user.id, role, e.target.checked)}
                              disabled={user.id === adminId && role === 'administrator'}
                            />
                            <span>{roleLabels[role]}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {user.id === adminId ? (
                      <span className="text-gray-400 text-xs">본인</span>
                    ) : (
                      <button
                        onClick={() => handleSave(user.id)}
                        disabled={
                          !pendingRoles[user.id] ||
                          JSON.stringify(pendingRoles[user.id]) === JSON.stringify(user.roles)
                        }
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        저장
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserRoleManager; 
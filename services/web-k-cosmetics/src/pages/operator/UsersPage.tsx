/**
 * UsersPage - K-Cosmetics 회원 관리
 */

import { useState } from 'react';

const users = [
  { id: 1, name: '김미영', email: 'miying@beauty.com', phone: '010-1234-5678', store: '뷰티랩 강남점', role: '매장관리자', status: '활성', lastLogin: '2024-01-15 14:30' },
  { id: 2, name: '이정은', email: 'jeongeun@cosme.com', phone: '010-2345-6789', store: '코스메틱 홍대점', role: '매장관리자', status: '활성', lastLogin: '2024-01-15 12:15' },
  { id: 3, name: '박수진', email: 'sujin@skin.com', phone: '010-3456-7890', store: '스킨케어 명동점', role: '직원', status: '활성', lastLogin: '2024-01-14 18:45' },
  { id: 4, name: '최혜원', email: 'hyewon@makeup.com', phone: '010-4567-8901', store: '메이크업 신촌점', role: '매장관리자', status: '휴면', lastLogin: '2023-12-20 10:30' },
  { id: 5, name: '정다은', email: 'daeun@beauty.com', phone: '010-5678-9012', store: '뷰티스타 압구정점', role: '직원', status: '활성', lastLogin: '2024-01-15 09:00' },
  { id: 6, name: '홍길동', email: 'admin@kcosmetics.com', phone: '010-0000-0000', store: '-', role: '운영자', status: '활성', lastLogin: '2024-01-15 15:00' },
];

const roleColors: Record<string, string> = {
  '운영자': 'bg-purple-100 text-purple-700',
  '매장관리자': 'bg-blue-100 text-blue-700',
  '직원': 'bg-gray-100 text-gray-700',
};

const statusColors: Record<string, string> = {
  '활성': 'bg-green-100 text-green-700',
  '휴면': 'bg-yellow-100 text-yellow-700',
  '정지': 'bg-red-100 text-red-700',
};

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const roles = ['all', '운영자', '매장관리자', '직원'];

  const filteredUsers = users.filter(user => {
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.store.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">회원 관리</h1>
          <p className="text-slate-500 mt-1">플랫폼 사용자 계정을 관리합니다</p>
        </div>
        <button className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium">
          + 회원 등록
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">전체 회원</p>
          <p className="text-2xl font-bold text-slate-800">{users.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">활성 회원</p>
          <p className="text-2xl font-bold text-green-600">{users.filter(u => u.status === '활성').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">매장 관리자</p>
          <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === '매장관리자').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">휴면 계정</p>
          <p className="text-2xl font-bold text-yellow-600">{users.filter(u => u.status === '휴면').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="이름, 이메일, 매장명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <div className="flex gap-2">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  roleFilter === role
                    ? 'bg-pink-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {role === 'all' ? '전체' : role}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">이름</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">이메일</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">연락처</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">소속 매장</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">권한</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상태</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">최근 로그인</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-slate-500">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-800">{user.name}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{user.phone}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{user.store}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[user.status]}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{user.lastLogin}</td>
                <td className="px-6 py-4 text-center">
                  <button className="text-pink-600 hover:text-pink-700 font-medium text-sm">
                    수정
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

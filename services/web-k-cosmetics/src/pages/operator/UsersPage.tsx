/**
 * UsersPage - K-Cosmetics 매장 멤버 관리
 *
 * WO-K-COSMETICS-OPERATOR-UI-REALIZATION-V1
 * Mock 제거 → 실 API 연동 + Soft Deactivate 구조 반영
 */

import { useState, useEffect, useCallback } from 'react';
import { operatorApi, type StoreMemberInfo } from '@/services/operatorApi';

const roleLabels: Record<string, string> = {
  owner: '매장 소유자',
  manager: '매장 관리자',
  staff: '직원',
};

const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  staff: 'bg-gray-100 text-gray-700',
};

export default function UsersPage() {
  const [members, setMembers] = useState<StoreMemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const data = await operatorApi.getMembers(includeInactive);
    setMembers(data || []);
    setLoading(false);
  }, [includeInactive]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleDeactivate = async (memberId: string) => {
    if (!confirm('이 멤버를 비활성화하시겠습니까?')) return;
    setActionLoading(memberId);
    const ok = await operatorApi.deactivateMember(memberId);
    setActionLoading(null);
    if (ok) await loadMembers();
  };

  const handleReactivate = async (memberId: string) => {
    setActionLoading(memberId);
    const ok = await operatorApi.reactivateMember(memberId);
    setActionLoading(null);
    if (ok) await loadMembers();
  };

  const roles = ['all', 'owner', 'manager', 'staff'];

  const filtered = members.filter((m) => {
    const matchRole = roleFilter === 'all' || m.role === roleFilter;
    const term = searchTerm.toLowerCase();
    const matchSearch =
      !term ||
      m.storeName.toLowerCase().includes(term) ||
      m.userId.toLowerCase().includes(term) ||
      m.role.toLowerCase().includes(term);
    return matchRole && matchSearch;
  });

  const activeCount = members.filter((m) => m.isActive).length;
  const inactiveCount = members.filter((m) => !m.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">매장 멤버 관리</h1>
        <p className="text-slate-500 mt-1">전체 매장의 멤버를 관리합니다</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">전체 멤버</p>
          <p className="text-2xl font-bold text-slate-800">{members.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">활성</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">비활성</p>
          <p className="text-2xl font-bold text-slate-400">{inactiveCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="매장명, 사용자 ID 검색..."
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
                {role === 'all' ? '전체' : roleLabels[role] || role}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap cursor-pointer">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded border-slate-300 text-pink-600 focus:ring-pink-500"
            />
            비활성 포함
          </label>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            {members.length === 0 ? '등록된 멤버가 없습니다' : '검색 결과가 없습니다'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">매장</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">권한</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상태</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">등록일</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-slate-500">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((m) => (
                <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${!m.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{m.storeName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{m.userId.slice(0, 8)}...</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[m.role] || 'bg-gray-100 text-gray-700'}`}>
                      {roleLabels[m.role] || m.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {m.isActive ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">활성</span>
                    ) : (
                      <div>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">비활성</span>
                        {m.deactivatedAt && (
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(m.deactivatedAt).toLocaleDateString('ko-KR')}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(m.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {m.isActive ? (
                      <button
                        onClick={() => handleDeactivate(m.id)}
                        disabled={actionLoading === m.id}
                        className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                      >
                        {actionLoading === m.id ? '처리중...' : '비활성화'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(m.id)}
                        disabled={actionLoading === m.id}
                        className="text-blue-500 hover:text-blue-700 font-medium text-sm disabled:opacity-50"
                      >
                        {actionLoading === m.id ? '처리중...' : '재활성화'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

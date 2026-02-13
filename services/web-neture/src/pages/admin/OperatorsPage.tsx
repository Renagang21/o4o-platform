/**
 * OperatorsPage - Neture 운영자 관리
 *
 * WO-NETURE-OPERATOR-UI-REALIZATION-V1
 * 실 API 연동 + Soft Deactivate 구조
 */

import { useState, useEffect, useCallback } from 'react';
import { adminOperatorApi, type NetureOperatorInfo } from '../../lib/api';

const roleLabels: Record<string, string> = {
  'neture:admin': '관리자',
  'neture:operator': '운영자',
};

const roleColors: Record<string, string> = {
  'neture:admin': 'bg-purple-100 text-purple-700',
  'neture:operator': 'bg-blue-100 text-blue-700',
};

export default function OperatorsPage() {
  const [operators, setOperators] = useState<NetureOperatorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadOperators = useCallback(async () => {
    setLoading(true);
    const data = await adminOperatorApi.getOperators(includeInactive);
    setOperators(data || []);
    setLoading(false);
  }, [includeInactive]);

  useEffect(() => {
    loadOperators();
  }, [loadOperators]);

  const handleDeactivate = async (userId: string) => {
    if (!confirm('이 운영자를 비활성화하시겠습니까?')) return;
    setActionLoading(userId);
    const ok = await adminOperatorApi.deactivateOperator(userId);
    setActionLoading(null);
    if (ok) await loadOperators();
  };

  const handleReactivate = async (userId: string) => {
    setActionLoading(userId);
    const ok = await adminOperatorApi.reactivateOperator(userId);
    setActionLoading(null);
    if (ok) await loadOperators();
  };

  const roles = ['all', 'neture:admin', 'neture:operator'];

  const filtered = operators.filter((op) => {
    const matchRole =
      roleFilter === 'all' || op.roles.includes(roleFilter);
    const term = searchTerm.toLowerCase();
    const matchSearch =
      !term ||
      op.name.toLowerCase().includes(term) ||
      op.email.toLowerCase().includes(term);
    return matchRole && matchSearch;
  });

  const activeCount = operators.filter((op) => op.isActive).length;
  const inactiveCount = operators.filter((op) => !op.isActive).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">운영자 관리</h1>
        <p className="text-slate-500 mt-1">Neture 서비스 운영자를 관리합니다</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">전체 운영자</p>
          <p className="text-2xl font-bold text-slate-800">{operators.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">활성</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">비활성</p>
          <p className="text-2xl font-bold text-slate-400">{inactiveCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="이름, 이메일 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex gap-2">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  roleFilter === role
                    ? 'bg-emerald-600 text-white'
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
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            비활성 포함
          </label>
        </div>
      </div>

      {/* Operators Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            {operators.length === 0 ? '등록된 운영자가 없습니다' : '검색 결과가 없습니다'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">이름</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">이메일</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">역할</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상태</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">등록일</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-slate-500">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((op) => (
                <tr
                  key={op.id}
                  className={`hover:bg-slate-50 transition-colors ${!op.isActive ? 'opacity-50' : ''}`}
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{op.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{op.id.slice(0, 8)}...</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{op.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {op.roles.map((role) => (
                        <span
                          key={role}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[role] || 'bg-gray-100 text-gray-700'}`}
                        >
                          {roleLabels[role] || role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {op.isActive ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        활성
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                        비활성
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(op.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {op.isActive ? (
                      <button
                        onClick={() => handleDeactivate(op.id)}
                        disabled={actionLoading === op.id}
                        className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                      >
                        {actionLoading === op.id ? '처리중...' : '비활성화'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(op.id)}
                        disabled={actionLoading === op.id}
                        className="text-blue-500 hover:text-blue-700 font-medium text-sm disabled:opacity-50"
                      >
                        {actionLoading === op.id ? '처리중...' : '재활성화'}
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

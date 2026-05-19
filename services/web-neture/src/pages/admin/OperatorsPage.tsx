/**
 * OperatorsPage - Neture 운영자 관리
 *
 * WO-NETURE-OPERATOR-UI-REALIZATION-V1
 * WO-O4O-NETURE-ADMIN-OPERATOR-DATATABLE-ALIGN-V1 — raw table → canonical DataTable
 * 실 API 연동 + Soft Deactivate 구조
 */

import { useState, useEffect, useCallback } from 'react';
import { UserX, UserCheck, UserPlus, X } from 'lucide-react';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { RowActionMenu } from '@o4o/ui';
import { toast } from '@o4o/error-handling';
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState<'neture:admin' | 'neture:operator'>('neture:operator');
  const [createLoading, setCreateLoading] = useState(false);

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
    setActionLoading(userId);
    const result = await adminOperatorApi.deactivateOperator(userId);
    setActionLoading(null);
    if (result.success) {
      await loadOperators();
    } else {
      toast.error(result.error || '권한 해제에 실패했습니다');
    }
  };

  const handleCreate = async () => {
    if (!createEmail.trim()) {
      toast.error('이메일을 입력해주세요');
      return;
    }
    setCreateLoading(true);
    const result = await adminOperatorApi.createOperator(createEmail.trim(), createRole);
    setCreateLoading(false);
    if (result.success) {
      const msg = result.data?.restored ? '기존 운영자 권한이 복원되었습니다' : '운영자가 추가되었습니다';
      toast.success(msg);
      setShowCreateModal(false);
      setCreateEmail('');
      setCreateRole('neture:operator');
      await loadOperators();
    } else {
      const errMsg = result.code === 'USER_NOT_FOUND'
        ? '해당 이메일로 가입된 계정이 없습니다'
        : result.code === 'ALREADY_OPERATOR'
        ? '이미 활성 운영자입니다'
        : result.error || '운영자 추가에 실패했습니다';
      toast.error(errMsg);
    }
  };

  const handleReactivate = async (userId: string) => {
    setActionLoading(userId);
    const result = await adminOperatorApi.reactivateOperator(userId);
    setActionLoading(null);
    if (result.success) {
      await loadOperators();
    } else {
      toast.error(result.error || '권한 복원에 실패했습니다');
    }
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

  const columns: ListColumnDef<NetureOperatorInfo>[] = [
    {
      key: 'name',
      header: '이름',
      sortable: true,
      sortAccessor: (row) => row.name,
      render: (_v, row) => (
        <div className={!row.isActive ? 'opacity-60' : ''}>
          <p className="font-medium text-slate-800">{row.name}</p>
          <p className="text-xs text-slate-400 mt-0.5" title={row.id}>
            {row.id.slice(0, 8)}...
          </p>
        </div>
      ),
    },
    {
      key: 'email',
      header: '이메일',
      sortable: true,
      sortAccessor: (row) => row.email,
      render: (_v, row) => (
        <span className={`text-sm text-slate-600 ${!row.isActive ? 'opacity-60' : ''}`} title={row.email}>
          {row.email}
        </span>
      ),
    },
    {
      key: 'roles',
      header: '역할',
      render: (_v, row) => (
        <div className={`flex flex-wrap gap-1 ${!row.isActive ? 'opacity-60' : ''}`}>
          {row.roles.map((role) => (
            <span
              key={role}
              className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[role] || 'bg-gray-100 text-gray-700'}`}
            >
              {roleLabels[role] || role}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: '상태',
      sortable: true,
      sortAccessor: (row) => (row.isActive ? 1 : 0),
      render: (_v, row) =>
        row.isActive ? (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            활성
          </span>
        ) : (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
            비활성
          </span>
        ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      sortable: true,
      sortAccessor: (row) => row.createdAt,
      render: (_v, row) => (
        <span className={`text-sm text-slate-500 ${!row.isActive ? 'opacity-60' : ''}`}>
          {new Date(row.createdAt).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '관리',
      system: true,
      align: 'center',
      width: '80px',
      onCellClick: () => {},
      render: (_v, row) => (
        <RowActionMenu
          inlineMax={1}
          actions={
            row.isActive
              ? [
                  {
                    key: 'deactivate',
                    label: '비활성화',
                    icon: <UserX className="w-4 h-4" />,
                    variant: 'danger',
                    loading: actionLoading === row.id,
                    onClick: () => handleDeactivate(row.id),
                    confirm: {
                      title: '운영자 비활성화',
                      message: `"${row.name}" 운영자를 비활성화하시겠습니까?`,
                      variant: 'danger',
                      confirmText: '비활성화',
                    },
                  },
                ]
              : [
                  {
                    key: 'reactivate',
                    label: '재활성화',
                    icon: <UserCheck className="w-4 h-4" />,
                    variant: 'primary',
                    loading: actionLoading === row.id,
                    onClick: () => handleReactivate(row.id),
                  },
                ]
          }
        />
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">운영자 관리</h1>
          <p className="text-slate-500 mt-1">Neture 서비스 운영자를 관리합니다</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          운영자 추가
        </button>
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
      <DataTable<NetureOperatorInfo>
        columns={columns}
        data={filtered}
        rowKey="id"
        loading={loading}
        emptyMessage={operators.length === 0 ? '등록된 운영자가 없습니다' : '검색 결과가 없습니다'}
        tableId="neture-admin-operators"
      />

      {/* Create Operator Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">운영자 추가</h2>
              <button
                onClick={() => { setShowCreateModal(false); setCreateEmail(''); setCreateRole('neture:operator'); }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              이미 가입된 계정의 이메일을 입력하세요. 해당 계정에 운영자 역할이 부여됩니다.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="operator@example.com"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">역할</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as 'neture:admin' | 'neture:operator')}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="neture:operator">운영자</option>
                  <option value="neture:admin">관리자</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCreateModal(false); setCreateEmail(''); setCreateRole('neture:operator'); }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={createLoading}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {createLoading ? '처리 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

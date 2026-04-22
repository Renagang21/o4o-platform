/**
 * OperatorStoreChannelsPage — Cross-store 채널 관리
 *
 * WO-O4O-STORE-CHANNEL-LIFECYCLE-V1:
 *   /api/v1/operator/stores/channels 기반 cross-store 채널 목록.
 *   상태 변경: APPROVED ↔ SUSPENDED → TERMINATED.
 *
 * WO-O4O-OPERATOR-LIST-TABLE-STANDARD-V3-PHASE3B-1:
 *   Raw HTML table → DataTable + ActionPolicy 표준 전환.
 *
 * Bearer token auth (KPA — getAccessToken 사용).
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Pause, Play, Power } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { RowActionMenu } from '@o4o/ui';
import { DataTable, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { getAccessToken } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// ─── Types ───

interface ChannelData {
  id: string;
  storeId: string;
  storeName: string;
  storeCode: string;
  channelType: string;
  status: string;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Constants ───

const CHANNEL_LABELS: Record<string, string> = {
  B2C: '온라인 스토어',
  KIOSK: '키오스크',
  TABLET: '태블릿',
  SIGNAGE: '사이니지',
};

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  APPROVED: { label: '활성', bg: 'bg-green-100', text: 'text-green-700' },
  PENDING: { label: '대기', bg: 'bg-amber-100', text: 'text-amber-800' },
  SUSPENDED: { label: '정지', bg: 'bg-slate-100', text: 'text-slate-500' },
  TERMINATED: { label: '종료', bg: 'bg-red-100', text: 'text-red-700' },
  REJECTED: { label: '거부', bg: 'bg-red-100', text: 'text-red-700' },
  EXPIRED: { label: '만료', bg: 'bg-slate-100', text: 'text-slate-500' },
};

// ─── API Helper ───

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Action Policy ───

const channelActionPolicy = defineActionPolicy<ChannelData>('kpa:store-channels', {
  rules: [
    {
      key: 'approve',
      label: '승인',
      visible: (row) => row.status === 'PENDING' || row.status === 'REJECTED',
    },
    {
      key: 'suspend',
      label: '비활성화',
      variant: 'warning',
      visible: (row) => row.status === 'APPROVED',
    },
    {
      key: 'activate',
      label: '재활성화',
      visible: (row) => row.status === 'SUSPENDED',
    },
    {
      key: 'terminate',
      label: '종료',
      variant: 'danger',
      divider: true,
      visible: (row) => row.status !== 'TERMINATED',
      confirm: (row) => ({
        title: '채널 종료',
        message: `${row.storeName}의 ${CHANNEL_LABELS[row.channelType] || row.channelType} 채널을 영구 종료하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
        confirmText: '종료',
        variant: 'danger' as const,
      }),
    },
  ],
});

const CHANNEL_ACTION_ICONS: Record<string, React.ReactNode> = {
  approve: <Check className="w-4 h-4" />,
  suspend: <Pause className="w-4 h-4" />,
  activate: <Play className="w-4 h-4" />,
  terminate: <Power className="w-4 h-4" />,
};

// ─── Component ───

export default function OperatorStoreChannelsPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('channelType', typeFilter);

      const data = await apiFetch<{
        success: boolean;
        channels: ChannelData[];
        pagination: PaginationData;
      }>(`/api/v1/operator/stores/channels?${params}`);

      if (data.success) {
        setChannels(data.channels);
        setPagination(data.pagination);
      }
    } catch (err: any) {
      setError(err?.message || '채널 데이터를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };

  const handleStatusChange = async (channel: ChannelData, newStatus: string) => {
    setActionLoading(channel.id);
    try {
      await apiFetch(`/api/v1/operator/stores/${channel.storeId}/channels/${channel.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchChannels();
    } catch (err: any) {
      toast.error(err?.message || '상태 변경에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return '-';
    }
  };

  // Stats from current page data
  const totalCount = pagination.total;
  const approvedCount = channels.filter((c) => c.status === 'APPROVED').length;
  const suspendedCount = channels.filter((c) => c.status === 'SUSPENDED').length;

  const columns: ListColumnDef<ChannelData>[] = [
    {
      key: 'storeName',
      header: '매장',
      render: (_v, row) => (
        <button
          onClick={() => navigate(`/operator/stores/${row.storeId}`)}
          className="text-left hover:text-blue-600 transition-colors"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <p className="font-medium text-sm text-slate-800" style={{ margin: 0 }}>{row.storeName}</p>
          <p className="text-xs text-slate-400 font-mono" style={{ margin: 0 }}>{row.storeCode || '-'}</p>
        </button>
      ),
    },
    {
      key: 'channelType',
      header: '채널',
      render: (value) => (
        <span className="text-sm text-slate-700">
          {CHANNEL_LABELS[value] || value}
        </span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      align: 'center' as const,
      render: (value) => {
        const badge = STATUS_BADGE[value] || { label: value, bg: 'bg-slate-100', text: 'text-slate-500' };
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: '생성일',
      render: (value) => <span className="text-sm text-slate-500">{formatDate(value)}</span>,
    },
    {
      key: '_actions',
      header: '액션',
      align: 'center' as const,
      width: '60px',
      system: true,
      onCellClick: () => {},
      render: (_v, row) => {
        if (row.status === 'TERMINATED') {
          return <span className="text-xs text-slate-400">영구 종료</span>;
        }
        return (
          <RowActionMenu
            actions={buildRowActions(channelActionPolicy, row, {
              approve: () => handleStatusChange(row, 'APPROVED'),
              suspend: () => handleStatusChange(row, 'SUSPENDED'),
              activate: () => handleStatusChange(row, 'APPROVED'),
              terminate: () => handleStatusChange(row, 'TERMINATED'),
            }, {
              icons: CHANNEL_ACTION_ICONS,
              loading: {
                approve: actionLoading === row.id,
                suspend: actionLoading === row.id,
                activate: actionLoading === row.id,
                terminate: actionLoading === row.id,
              },
            })}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">채널 관리</h1>
          <p className="text-slate-500 text-sm mt-1">전체 매장의 채널 상태를 관리합니다</p>
        </div>
        <button
          onClick={fetchChannels}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          새로고침
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-800">{totalCount}</p>
          <p className="text-xs text-slate-500">전체 채널</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          <p className="text-xs text-slate-500">활성 (현재 페이지)</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-500">{suspendedCount}</p>
          <p className="text-xs text-slate-500">정지 (현재 페이지)</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="매장명/코드 검색..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 상태</option>
            <option value="APPROVED">활성</option>
            <option value="SUSPENDED">정지</option>
            <option value="TERMINATED">종료</option>
            <option value="PENDING">대기</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 채널</option>
            <option value="B2C">온라인 스토어</option>
            <option value="KIOSK">키오스크</option>
            <option value="TABLET">태블릿</option>
            <option value="SIGNAGE">사이니지</option>
          </select>
          <button onClick={handleSearch} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm font-medium">
            검색
          </button>
        </div>

        <DataTable<ChannelData>
          columns={columns}
          data={channels}
          rowKey="id"
          loading={isLoading}
          emptyMessage="채널 데이터가 없습니다"
          tableId="kpa-store-channels"
        />

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              총 {pagination.total}개 중 {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}개
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(currentPage - 2, pagination.totalPages - 4));
                return start + i;
              }).filter(p => p <= pagination.totalPages).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page ? 'bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage === pagination.totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

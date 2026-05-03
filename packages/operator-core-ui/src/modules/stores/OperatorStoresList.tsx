/**
 * OperatorStoresList — Stores Management 모듈 메인 컴포넌트
 *
 * WO-O4O-OPERATOR-STORES-CORE-EXTRACTION-V1
 * 설계 기준: docs/architecture/OPERATOR-CORE-DESIGN-V1.md §4
 *
 * 3 서비스 공통 매장 목록 페이지. 각 서비스는 StoresApi adapter + StoresConfig 를
 * 주입하여 thin wrapper 로 사용한다. DataTable 은 OPERATOR-DATATABLE-POLICY-V1 §2.1
 * 표준에 따라 @o4o/operator-ux-core 의 DataTable 만 사용한다.
 */

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { DataTable, Pagination, type ListColumnDef } from '@o4o/operator-ux-core';
import { useStoresQuery } from './useStoresQuery';
import type {
  OperatorStoreBase,
  OperatorStoresListProps,
  StoresConfig,
} from './types';

// ─── Color scheme tokens ─────────────────────────────────────────────────────

const SCHEME_TOKENS: Record<NonNullable<StoresConfig['colorScheme']>, {
  primary: string;
  primaryHover: string;
  primaryText: string;
  searchRing: string;
}> = {
  slate: {
    primary: 'bg-slate-700',
    primaryHover: 'hover:bg-slate-800',
    primaryText: 'text-slate-700',
    searchRing: 'focus:ring-blue-500',
  },
  primary: {
    primary: 'bg-primary-600',
    primaryHover: 'hover:bg-primary-700',
    primaryText: 'text-primary-700',
    searchRing: 'focus:ring-primary-500',
  },
  pink: {
    primary: 'bg-pink-600',
    primaryHover: 'hover:bg-pink-700',
    primaryText: 'text-pink-700',
    searchRing: 'focus:ring-pink-500',
  },
};

// ─── Default columns ─────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return '-';
  }
}

function buildDefaultColumns<T extends OperatorStoreBase>(
  config: StoresConfig,
): ListColumnDef<T>[] {
  const typeLabels = config.typeLabels ?? {};
  return [
    {
      key: 'name',
      header: `${config.terminology.storeLabel}명`,
      sortable: true,
      render: (_v, row) => (
        <div>
          <p className="font-medium text-slate-800 text-sm">{row.name}</p>
          {row.type && (
            <p className="text-xs text-slate-400 mt-0.5">{typeLabels[row.type] ?? row.type}</p>
          )}
        </div>
      ),
    },
    {
      key: 'code',
      header: '코드',
      width: '100px',
      render: (v) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
          {v || '-'}
        </span>
      ),
    },
    {
      key: 'ownerName',
      header: '운영자',
      render: (_v, row) => row.ownerName ? (
        <div>
          <p className="text-sm text-slate-700">{row.ownerName}</p>
          {row.ownerEmail && <p className="text-xs text-slate-400">{row.ownerEmail}</p>}
        </div>
      ) : (
        <span className="text-sm text-slate-300">-</span>
      ),
    },
    {
      key: 'channelCount',
      header: '채널',
      align: 'center',
      width: '60px',
      sortable: true,
      render: (v) => (
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
          v > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
        }`}>
          {v}
        </span>
      ),
    },
    {
      key: 'productCount',
      header: '상품',
      align: 'center',
      width: '60px',
      sortable: true,
      render: (v) => (
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
          v > 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'
        }`}>
          {v}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: '상태',
      align: 'center',
      width: '80px',
      render: (v) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          v ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {v ? '활성' : '비활성'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: '생성일',
      width: '110px',
      sortable: true,
      sortAccessor: (row) => new Date(row.createdAt).getTime(),
      render: (v) => <span className="text-sm text-slate-500">{formatDate(v)}</span>,
    },
    {
      key: '_nav',
      header: '',
      width: '40px',
      system: true,
      render: () => <ChevronRight className="w-4 h-4 text-slate-300" />,
    },
  ];
}

// ─── Stat card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  value: number;
  label: string;
  tone: 'slate' | 'green' | 'blue' | 'purple';
}

const STAT_TONE: Record<StatCardProps['tone'], string> = {
  slate: 'text-slate-800',
  green: 'text-green-600',
  blue: 'text-blue-600',
  purple: 'text-purple-600',
};

function StatCard({ value, label, tone }: StatCardProps): ReactNode {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100">
      <p className={`text-2xl font-bold ${STAT_TONE[tone]}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function OperatorStoresList<T extends OperatorStoreBase = OperatorStoreBase>(
  props: OperatorStoresListProps<T>,
) {
  const {
    api,
    config,
    columns,
    pageSize = 20,
    defaultSort = { field: 'createdAt', order: 'DESC' },
    selectable = true,
    rowActionsExtra,
    headerExtras,
    onRowClick,
    showStats = true,
    title,
    subtitle,
    searchPlaceholder,
    tableId,
  } = props;

  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const tokens = SCHEME_TOKENS[config.colorScheme ?? 'slate'];

  const { stores, stats, pagination, loading, error, refetch } = useStoresQuery<T>({
    api,
    page: currentPage,
    search: searchTerm,
    pageSize,
    sortBy: defaultSort.field,
    sortOrder: defaultSort.order,
  });

  // Reset selection on search/page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchTerm, currentPage]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  // Default columns + optional rowActionsExtra column appended
  const effectiveColumns = useMemo<ListColumnDef<T>[]>(() => {
    const base = columns ?? buildDefaultColumns<T>(config);
    if (!rowActionsExtra) return base;
    // 행 액션 컬럼 추가 (system column)
    return [
      ...base,
      {
        key: '_actions',
        header: '',
        width: '120px',
        system: true,
        render: (_v, row) => {
          const actions = rowActionsExtra(row);
          if (actions.length === 0) return null;
          return (
            <div className="flex items-center gap-1 justify-end">
              {actions.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    a.onClick();
                  }}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    a.variant === 'danger'
                      ? 'text-red-600 hover:bg-red-50'
                      : a.variant === 'warning'
                      ? 'text-amber-600 hover:bg-amber-50'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          );
        },
      },
    ];
  }, [columns, rowActionsExtra, config]);

  const statsLabels = config.statsLabels ?? {};
  const resolvedTitle = title ?? `${config.terminology.storeLabel} 관리`;
  const resolvedSubtitle = subtitle ?? `O4O 플랫폼 ${config.terminology.storeLabel} 목록`;
  const resolvedSearchPlaceholder = searchPlaceholder ?? `${config.terminology.storeLabel}명, 코드, 운영자 검색...`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{resolvedTitle}</h1>
          <p className="text-slate-500 text-sm mt-1">{resolvedSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {headerExtras}
          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            새로고침
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      {/* Stats */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            value={stats.totalStores}
            label={statsLabels.totalStores ?? `전체 ${config.terminology.storeLabel}`}
            tone="slate"
          />
          <StatCard
            value={stats.activeStores}
            label={statsLabels.activeStores ?? `활성 ${config.terminology.storeLabel}`}
            tone="green"
          />
          <StatCard
            value={stats.withChannel}
            label={statsLabels.withChannel ?? '채널 보유'}
            tone="blue"
          />
          <StatCard
            value={stats.withProducts}
            label={statsLabels.withProducts ?? '상품 보유'}
            tone="purple"
          />
        </div>
      )}

      {/* Search + Table */}
      <div>
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder={resolvedSearchPlaceholder}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 ${tokens.searchRing} focus:border-transparent text-sm`}
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className={`px-4 py-2 ${tokens.primary} text-white rounded-lg ${tokens.primaryHover} transition-colors text-sm font-medium`}
            >
              검색
            </button>
          </div>
        </div>

        {/* DataTable (Operator 표준 — operator-ux-core) */}
        <DataTable<T>
          columns={effectiveColumns}
          data={stores}
          rowKey={'id' as keyof T}
          loading={loading}
          emptyMessage={`${config.terminology.storeLabel} 데이터가 없습니다`}
          onRowClick={onRowClick}
          tableId={tableId ?? `${config.serviceKey}-stores`}
          selectable={selectable}
          selectedKeys={selectedIds}
          onSelectionChange={setSelectedIds}
        />

        {/* Pagination (operator-ux-core 외부 결합) */}
        {!loading && pagination.totalPages > 1 && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}

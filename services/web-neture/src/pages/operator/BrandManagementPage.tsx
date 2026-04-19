/**
 * BrandManagementPage — 운영자 브랜드 관리
 * WO-NETURE-BRAND-MANAGEMENT-V1
 * WO-O4O-TABLE-STANDARD-V2 — DataTable 표준 전환
 *
 * 기능: 검색 / 이름 수정 / 병합
 * 브랜드 생성 UI 없음 (자동 생성 유지)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, GitMerge, X, Package } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { EditableTextCell, RowActionMenu, ConfirmActionDialog } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { operatorBrandApi, type BrandItem } from '../../lib/api/operatorBrand';

export default function BrandManagementPage() {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Merge state
  const [mergeSource, setMergeSource] = useState<BrandItem | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSearch, setMergeSearch] = useState('');
  const [merging, setMerging] = useState(false);
  const [pendingMergeTarget, setPendingMergeTarget] = useState<BrandItem | null>(null);

  const loadBrands = useCallback(async (q?: string) => {
    setLoading(true);
    const data = await operatorBrandApi.getBrands(q);
    setBrands(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadBrands(); }, [loadBrands]);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadBrands(value), 300);
  };

  // ======== Merge ========

  const openMerge = (brand: BrandItem) => {
    setMergeSource(brand);
    setMergeSearch('');
    setShowMergeModal(true);
  };

  const handleMergeSelect = (target: BrandItem) => {
    setPendingMergeTarget(target);
  };

  const executeMerge = async () => {
    if (!mergeSource || !pendingMergeTarget) return;

    setMerging(true);
    const res = await operatorBrandApi.mergeBrands(mergeSource.id, pendingMergeTarget.id);
    setMerging(false);

    if (res.success) {
      toast.success(`병합 완료: ${res.data?.merged ?? 0}개 상품 이관`);
      setShowMergeModal(false);
      setMergeSource(null);
      setPendingMergeTarget(null);
      loadBrands(search);
    } else {
      toast.error(res.error || '병합 실패');
    }
  };

  // 병합 대상 후보 (source 제외)
  const mergeTargets = brands.filter(b =>
    b.id !== mergeSource?.id &&
    (!mergeSearch || b.name.toLowerCase().includes(mergeSearch.toLowerCase()))
  );

  // ─── Column Definitions ───

  const columns: ListColumnDef<BrandItem>[] = [
    {
      key: 'name',
      header: '브랜드명',
      sortable: true,
      render: (_v, row) => (
        <EditableTextCell
          value={row.name}
          onSave={async (newName) => {
            const res = await operatorBrandApi.updateBrand(row.id, newName);
            if (res.success) {
              toast.success('브랜드명이 수정되었습니다');
              loadBrands(search);
            } else {
              toast.error(res.error || '수정 실패');
              throw new Error(res.error || '수정 실패');
            }
          }}
          className="font-medium text-slate-800"
        />
      ),
    },
    {
      key: 'productCount',
      header: (
        <div className="flex items-center justify-center gap-1">
          <Package className="w-3.5 h-3.5" />
          상품 수
        </div>
      ),
      align: 'center',
      width: '100px',
      sortable: true,
      sortAccessor: (row) => row.productCount,
      render: (_v, row) => (
        <span className={`text-sm font-medium ${row.productCount > 0 ? 'text-slate-700' : 'text-slate-400'}`}>
          {row.productCount}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '액션',
      system: true,
      align: 'center',
      width: '60px',
      onCellClick: () => {},
      render: (_v, row) => (
        <RowActionMenu
          inlineMax={1}
          actions={[
            {
              key: 'merge',
              label: '병합',
              icon: <GitMerge className="w-4 h-4" />,
              onClick: () => openMerge(row),
              variant: 'warning',
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">브랜드 관리</h1>
        <p className="text-sm text-slate-500 mt-1">중복 브랜드를 검색하고 병합하여 데이터 품질을 관리합니다</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="브랜드 검색..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Stats */}
      <div className="text-sm text-slate-500">
        총 {brands.length}개 브랜드
      </div>

      {/* DataTable */}
      <DataTable<BrandItem>
        columns={columns}
        data={brands}
        rowKey="id"
        loading={loading}
        emptyMessage={search ? '검색 결과가 없습니다' : '브랜드가 없습니다'}
        tableId="neture-brand-management"
      />

      {/* Merge Confirm Dialog */}
      <ConfirmActionDialog
        open={!!pendingMergeTarget}
        onClose={() => setPendingMergeTarget(null)}
        onConfirm={executeMerge}
        title="브랜드 병합 확인"
        message={mergeSource && pendingMergeTarget
          ? `"${mergeSource.name}"의 상품 ${mergeSource.productCount}개를 "${pendingMergeTarget.name}"으로 이관하고\n"${mergeSource.name}" 브랜드를 삭제합니다.`
          : ''}
        confirmText="병합"
        variant="warning"
        loading={merging}
      />

      {/* Merge Modal */}
      {showMergeModal && mergeSource && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">브랜드 병합</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  "<span className="font-medium text-orange-600">{mergeSource.name}</span>"을(를) 병합할 대상 브랜드를 선택하세요
                </p>
              </div>
              <button onClick={() => setShowMergeModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="대상 브랜드 검색..."
                  value={mergeSearch}
                  onChange={e => setMergeSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {mergeTargets.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">대상 브랜드가 없습니다</p>
              ) : (
                <div className="space-y-1">
                  {mergeTargets.map(target => (
                    <button
                      key={target.id}
                      onClick={() => handleMergeSelect(target)}
                      disabled={merging}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-emerald-50 text-left transition-colors disabled:opacity-50"
                    >
                      <div>
                        <span className="text-sm font-medium text-slate-800">{target.name}</span>
                        {target.manufacturer_name && (
                          <span className="text-xs text-slate-400 ml-2">({target.manufacturer_name})</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{target.productCount}개 상품</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <p className="text-xs text-slate-500">
                병합 시 "{mergeSource.name}"의 상품 {mergeSource.productCount}개가 선택한 브랜드로 이관되고, "{mergeSource.name}"은 삭제됩니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

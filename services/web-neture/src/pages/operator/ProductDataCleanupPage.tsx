/**
 * ProductDataCleanupPage — 상품 데이터 정리
 * WO-NETURE-PRODUCT-DATA-CLEANUP-V1
 *
 * 탭: 중복 Master | 카테고리 없음 | 브랜드 없음
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, GitMerge, CheckCircle, AlertTriangle, Tag, Bookmark, Trash2, RotateCcw, XCircle } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  productCleanupApi,
  type DuplicateMaster,
  type MissingFieldItem,
  type RecycleBinItem,
} from '../../lib/api/operatorProductCleanup';
import { productApi, type CategoryTreeItem, type BrandItem } from '../../lib/api/product';

type Tab = 'duplicates' | 'missing-category' | 'missing-brand' | 'recycle-bin';

const TABS: { key: Tab; label: string; icon: typeof GitMerge }[] = [
  { key: 'duplicates', label: '중복 Master', icon: GitMerge },
  { key: 'missing-category', label: '카테고리 없음', icon: Tag },
  { key: 'missing-brand', label: '브랜드 없음', icon: Bookmark },
  { key: 'recycle-bin', label: '휴지통', icon: Trash2 },
];

/** Flatten category tree for dropdown */
function flatCategories(nodes: CategoryTreeItem[], level = 0): { id: string; name: string; level: number }[] {
  const result: { id: string; name: string; level: number }[] = [];
  for (const n of nodes) {
    result.push({ id: n.id, name: n.name, level });
    if (n.children?.length) result.push(...flatCategories(n.children, level + 1));
  }
  return result;
}

export default function ProductDataCleanupPage() {
  const [tab, setTab] = useState<Tab>('duplicates');
  const [loading, setLoading] = useState(true);

  // Data
  const [duplicates, setDuplicates] = useState<DuplicateMaster[]>([]);
  const [missingCategory, setMissingCategory] = useState<MissingFieldItem[]>([]);
  const [missingBrand, setMissingBrand] = useState<MissingFieldItem[]>([]);
  const [recycleBin, setRecycleBin] = useState<RecycleBinItem[]>([]);
  const [recycleBinTotal, setRecycleBinTotal] = useState(0);

  // Reference data
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');

  const loadData = useCallback(async (t: Tab) => {
    setLoading(true);
    setSelectedIds(new Set());
    if (t === 'duplicates') {
      setDuplicates(await productCleanupApi.getDuplicateMasters());
    } else if (t === 'missing-category') {
      const [items, cats] = await Promise.all([
        productCleanupApi.getMissingCategory(),
        categories.length ? Promise.resolve(categories) : productApi.getCategories(),
      ]);
      setMissingCategory(items);
      if (!categories.length) setCategories(cats);
    } else if (t === 'missing-brand') {
      const [items, brs] = await Promise.all([
        productCleanupApi.getMissingBrand(),
        brands.length ? Promise.resolve(brands) : productApi.getBrands(),
      ]);
      setMissingBrand(items);
      if (!brands.length) setBrands(brs);
    } else if (t === 'recycle-bin') {
      const res = await productCleanupApi.getRecycleBin(1, 100);
      setRecycleBin(res.data || []);
      setRecycleBinTotal(res.pagination?.total || 0);
    }
    setLoading(false);
  }, [categories.length, brands.length]);

  useEffect(() => { loadData(tab); }, [tab, loadData]);

  const handleTabChange = (t: Tab) => { setTab(t); };

  // ========== Duplicate Masters — Merge ==========

  const handleMerge = async (dup: DuplicateMaster) => {
    // Keep first (oldest), merge rest into it
    const targetId = dup.masterIds[0];
    const sourceIds = dup.masterIds.slice(1);
    if (!confirm(`"${dup.names[0]}" (${dup.barcode})을 기준으로\n${sourceIds.length}개 중복을 병합합니다. 계속?`)) return;

    let totalOffers = 0;
    let totalImages = 0;
    for (const sourceId of sourceIds) {
      const res = await productCleanupApi.mergeMasters(sourceId, targetId);
      if (!res.success) {
        toast.error(`병합 실패: ${res.error}`);
        return;
      }
      totalOffers += res.data?.offersMigrated ?? 0;
      totalImages += res.data?.imagesMigrated ?? 0;
    }
    toast.success(`병합 완료: ${totalOffers} offers, ${totalImages} images 이관`);
    loadData('duplicates');
  };

  // ========== Missing Category — Batch Fix ==========

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (items: MissingFieldItem[]) => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const handleFixCategory = async () => {
    if (!selectedIds.size || !selectedCategoryId) {
      toast.error('상품과 카테고리를 선택하세요');
      return;
    }
    const res = await productCleanupApi.fixCategory(Array.from(selectedIds), selectedCategoryId);
    if (res.success) {
      toast.success(`${res.data?.updated ?? 0}개 상품 카테고리 수정 완료`);
      loadData('missing-category');
    } else {
      toast.error(res.error || '수정 실패');
    }
  };

  const handleFixBrand = async () => {
    if (!selectedIds.size || !selectedBrandId) {
      toast.error('상품과 브랜드를 선택하세요');
      return;
    }
    const res = await productCleanupApi.fixBrand(Array.from(selectedIds), selectedBrandId);
    if (res.success) {
      toast.success(`${res.data?.updated ?? 0}개 상품 브랜드 수정 완료`);
      loadData('missing-brand');
    } else {
      toast.error(res.error || '수정 실패');
    }
  };

  const flatCats = flatCategories(categories);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">상품 데이터 정리</h1>
        <p className="text-sm text-slate-500 mt-1">중복/누락 데이터를 탐지하고 운영자가 직접 정리합니다</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map(t => {
          const count = t.key === 'duplicates' ? duplicates.length
            : t.key === 'missing-category' ? missingCategory.length
            : missingBrand.length;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {!loading && count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                  tab === t.key ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <>
          {/* ====== Duplicates ====== */}
          {tab === 'duplicates' && (
            duplicates.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <CheckCircle className="w-12 h-12 mb-3 text-green-400" />
                <p className="text-lg font-medium text-green-600">중복 Master 없음</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">바코드</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">상품명</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 w-20">중복 수</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-600 w-24">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {duplicates.map(dup => (
                      <tr key={dup.barcode} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-mono text-slate-700">{dup.barcode}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-800">{dup.names[0]}</div>
                          {dup.names.length > 1 && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              + {dup.names.slice(1).join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            <AlertTriangle className="w-3 h-3" />
                            {dup.count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleMerge(dup)}
                            className="px-3 py-1 text-xs font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
                          >
                            병합
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ====== Missing Category ====== */}
          {tab === 'missing-category' && (
            missingCategory.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <CheckCircle className="w-12 h-12 mb-3 text-green-400" />
                <p className="text-lg font-medium text-green-600">카테고리 미지정 상품 없음</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Batch action bar */}
                <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3">
                  <span className="text-sm text-slate-600">{selectedIds.size}개 선택</span>
                  <select
                    value={selectedCategoryId}
                    onChange={e => setSelectedCategoryId(e.target.value)}
                    className="flex-1 max-w-xs px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">카테고리 선택...</option>
                    {flatCats.map(c => (
                      <option key={c.id} value={c.id}>{'─'.repeat(c.level)} {c.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleFixCategory}
                    disabled={!selectedIds.size || !selectedCategoryId}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-40"
                  >
                    일괄 적용
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === missingCategory.length && missingCategory.length > 0}
                            onChange={() => toggleSelectAll(missingCategory)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">상품명</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">바코드</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">규제유형</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 w-20">Offers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {missingCategory.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.id)}
                              onChange={() => toggleSelect(item.id)}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-800">{item.name}</td>
                          <td className="px-4 py-3 text-sm font-mono text-slate-600">{item.barcode}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{item.regulatoryType}</td>
                          <td className="px-4 py-3 text-center text-sm text-slate-500">{item.offerCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* ====== Missing Brand ====== */}
          {tab === 'missing-brand' && (
            missingBrand.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <CheckCircle className="w-12 h-12 mb-3 text-green-400" />
                <p className="text-lg font-medium text-green-600">브랜드 미지정 상품 없음</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Batch action bar */}
                <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3">
                  <span className="text-sm text-slate-600">{selectedIds.size}개 선택</span>
                  <select
                    value={selectedBrandId}
                    onChange={e => setSelectedBrandId(e.target.value)}
                    className="flex-1 max-w-xs px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">브랜드 선택...</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleFixBrand}
                    disabled={!selectedIds.size || !selectedBrandId}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-40"
                  >
                    일괄 적용
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === missingBrand.length && missingBrand.length > 0}
                            onChange={() => toggleSelectAll(missingBrand)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">상품명</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">바코드</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">브랜드명 (legacy)</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 w-20">Offers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {missingBrand.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.id)}
                              onChange={() => toggleSelect(item.id)}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-800">{item.name}</td>
                          <td className="px-4 py-3 text-sm font-mono text-slate-600">{item.barcode}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{item.brandName || '—'}</td>
                          <td className="px-4 py-3 text-center text-sm text-slate-500">{item.offerCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* ── Recycle Bin Tab ── */}
      {tab === 'recycle-bin' && (
        loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
        ) : recycleBin.length === 0 ? (
          <div className="text-center py-12">
            <Trash2 size={32} className="mx-auto text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">휴지통이 비어 있습니다</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-600">총 <strong>{recycleBinTotal}</strong>건</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">상품명</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">바코드</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">공급자</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">삭제일</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">삭제자</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">사유</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recycleBin.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-800">{item.name || '-'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-600">{item.barcode}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.supplier_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{item.deleted_at ? new Date(item.deleted_at).toLocaleDateString('ko-KR') : '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{item.deleted_by_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{item.delete_reason || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={async () => {
                              if (!confirm(`"${item.name}"을 복구하시겠습니까?`)) return;
                              const res = await productCleanupApi.restore(item.id);
                              if (res.success) { toast.success('복구 완료'); loadData('recycle-bin'); }
                              else toast.error(res.error || '복구 실패');
                            }}
                            className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="복구"
                          >
                            <RotateCcw size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`"${item.name}"을 완전 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
                              const res = await productCleanupApi.hardDelete(item.id);
                              if (res.success) { toast.success('완전 삭제 완료'); loadData('recycle-bin'); }
                              else toast.error(res.blockReasons ? `삭제 불가: ${res.blockReasons.join(', ')}` : (res.error || '삭제 실패'));
                            }}
                            className="p-1.5 rounded hover:bg-red-50 text-red-600" title="완전 삭제"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}

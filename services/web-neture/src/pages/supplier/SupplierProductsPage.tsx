/**
 * SupplierProductsPage — 엑셀형 공급자 제품 관리
 *
 * WO-NETURE-SUPPLIER-EXCEL-LIST-V1
 * WO-NETURE-SUPPLIER-BULK-EDIT-UX-V1 — 다건 가격 편집, 체크박스 선택, 벌크 모달
 * WO-NETURE-SUPPLIER-CONTENT-EDIT-UX-V1 — 이미지/설명 필터, 업로드 모달, 설명 편집 모달
 *
 * EditableDataTable 기반. 다건 인라인 편집 + batch 저장.
 * 검색/정렬/페이지네이션/필터 지원.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Sparkles, ImagePlus, X } from 'lucide-react';
import {
  EditableDataTable,
  SearchBar,
  Pagination,
} from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { supplierApi, productApi, type SupplierProduct, type SupplierProductPurpose } from '../../lib/api';

// ─── Badge configs ───

const PURPOSE_CONFIG: Record<SupplierProductPurpose, { label: string; bg: string; text: string }> = {
  CATALOG: { label: '정보 제공', bg: 'bg-slate-100', text: 'text-slate-600' },
  APPLICATION: { label: '신청 가능', bg: 'bg-blue-50', text: 'text-blue-700' },
  ACTIVE_SALES: { label: '판매 중', bg: 'bg-green-50', text: 'text-green-700' },
};

const APPROVAL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  approved: { label: '승인', bg: 'bg-green-50', text: 'text-green-700' },
  pending: { label: '대기', bg: 'bg-amber-50', text: 'text-amber-700' },
  rejected: { label: '거부', bg: 'bg-red-50', text: 'text-red-700' },
};

// ─── Filter Chip ───

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-slate-800 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Bulk Price Modal ───

function BulkPriceModal({
  count,
  onClose,
  onApply,
  applying,
}: {
  count: number;
  onClose: () => void;
  onApply: (op: string, value: number) => void;
  applying: boolean;
}) {
  const [operation, setOperation] = useState('INCREASE');
  const [value, setValue] = useState<number>(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[400px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">일괄 가격 변경</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">{count}개 상품 선택됨</p>

        <div className="space-y-3">
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="INCREASE">금액 인상</option>
            <option value="DECREASE">금액 인하</option>
            <option value="PERCENT_INCREASE">% 인상</option>
            <option value="PERCENT_DECREASE">% 인하</option>
            <option value="SET">금액 지정</option>
          </select>

          <input
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            placeholder={operation.includes('PERCENT') ? '퍼센트 (%)' : '금액 (원)'}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} disabled={applying} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">취소</button>
          <button
            onClick={() => onApply(operation, value)}
            disabled={applying || value <= 0}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
          >
            {applying ? '적용 중...' : '적용'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Image Upload Modal ───

function ImageUploadModal({
  masterId,
  onClose,
  onUploaded,
}: {
  masterId: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await productApi.uploadProductImage(masterId, file, 'thumbnail');
      onUploaded();
    } catch {
      alert('이미지 업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[400px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">이미지 업로드</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>

        {preview ? (
          <div className="mb-4 flex justify-center">
            <img src={preview} alt="미리보기" className="max-h-48 rounded-lg object-contain" />
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            className="mb-4 border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400"
          >
            <ImagePlus size={32} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-500">클릭하여 이미지 선택</p>
          </div>
        )}

        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={uploading} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">취소</button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
          >
            {uploading ? '업로드 중...' : '업로드'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Description Edit Modal ───

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

function DescriptionEditModal({
  product,
  onClose,
  onSaved,
}: {
  product: SupplierProduct;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [shortDesc, setShortDesc] = useState(stripHtml(product.consumerShortDescription));
  const [detailDesc, setDetailDesc] = useState(stripHtml(product.consumerDetailDescription));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supplierApi.updateProduct(product.id, {
        consumerShortDescription: shortDesc ? `<p>${shortDesc}</p>` : '',
        consumerDetailDescription: detailDesc ? `<p>${detailDesc}</p>` : '',
      });
      onSaved();
    } catch {
      alert('설명 저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[480px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">상품 설명 편집</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>

        <p className="text-sm text-slate-500 mb-4">{product.name || product.masterName}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">간단 소개</label>
            <textarea
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="소비자에게 보여줄 간단 소개"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">상세 설명</label>
            <textarea
              value={detailDesc}
              onChange={(e) => setDetailDesc(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="상세 설명 (성분, 용법 등)"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">취소</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Column definitions ───

const baseColumns: ListColumnDef<SupplierProduct>[] = [
  {
    key: 'barcode',
    header: '바코드',
    width: '120px',
    render: (v) => <span className="font-mono text-xs">{v || '-'}</span>,
  },
  {
    key: 'name',
    header: '상품명',
    width: '180px',
    render: (v) => <span className="font-medium">{v || '-'}</span>,
  },
  {
    key: 'categoryName',
    header: '카테고리',
    width: '100px',
    render: (v) => v || '-',
  },
  // primaryImageUrl column is inserted dynamically below
  {
    key: 'priceGeneral',
    header: '공급가',
    width: '110px',
    align: 'right',
    editable: true,
    render: (v) =>
      v != null ? `${Number(v).toLocaleString()}원` : '-',
    editRender: (value, _row, onChange) => (
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full px-2 py-1 text-sm text-right border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      />
    ),
  },
  {
    key: 'consumerReferencePrice',
    header: '소비자가',
    width: '100px',
    align: 'right',
    editable: true,
    render: (v) =>
      v != null ? `${Number(v).toLocaleString()}원` : '-',
    editRender: (value, _row, onChange) => (
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full px-2 py-1 text-sm text-right border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      />
    ),
  },
  {
    key: 'distributionType',
    header: '유통',
    width: '90px',
    align: 'center',
    editable: true,
    render: (v) => {
      const config: Record<string, { label: string; cls: string }> = {
        PUBLIC: { label: '전체 공개', cls: 'bg-green-50 text-green-700' },
        SERVICE: { label: '서비스', cls: 'bg-blue-50 text-blue-700' },
        PRIVATE: { label: '비공개', cls: 'bg-amber-50 text-amber-700' },
      };
      const c = config[v] || config.PUBLIC;
      return (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${c.cls}`}>
          {c.label}
        </span>
      );
    },
    editRender: (value, _row, onChange) => (
      <select
        value={value || 'PUBLIC'}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      >
        <option value="PUBLIC">전체 공개</option>
        <option value="SERVICE">서비스</option>
      </select>
    ),
  },
  {
    key: 'isActive',
    header: '활성',
    width: '60px',
    align: 'center',
    editable: true,
    render: (v) => (
      <span className={`inline-block w-3 h-3 rounded-full ${v ? 'bg-green-500' : 'bg-slate-300'}`} />
    ),
    editRender: (value, _row, onChange) => (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-blue-600 cursor-pointer"
      />
    ),
  },
  {
    key: 'purpose',
    header: '상태',
    width: '80px',
    align: 'center',
    render: (v: SupplierProductPurpose) => {
      const cfg = PURPOSE_CONFIG[v] || PURPOSE_CONFIG.CATALOG;
      return (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
          {cfg.label}
        </span>
      );
    },
  },
  {
    key: 'approvalStatus',
    header: '승인',
    width: '60px',
    align: 'center',
    render: (v: string) => {
      const cfg = APPROVAL_CONFIG[v] || { label: v || '-', bg: 'bg-slate-50', text: 'text-slate-600' };
      return (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
          {cfg.label}
        </span>
      );
    },
  },
  {
    key: 'tags',
    header: '태그',
    width: '150px',
    render: (v: string[] | undefined | null) => {
      const tags = Array.isArray(v) ? v : [];
      if (tags.length === 0) return <span className="text-xs text-slate-400">-</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{tag}</span>
          ))}
          {tags.length > 3 && (
            <span className="text-xs text-slate-400">+{tags.length - 3}</span>
          )}
        </div>
      );
    },
  },
];

// ─── Page Component ───

export default function SupplierProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingTagFor, setGeneratingTagFor] = useState<string | null>(null);

  // Bulk edit state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Filter state
  const [filterHasImage, setFilterHasImage] = useState('');
  const [filterHasDescription, setFilterHasDescription] = useState('');
  const [filterBarcodeSource, setFilterBarcodeSource] = useState('');

  // Modal state
  const [imageUploadMasterId, setImageUploadMasterId] = useState<string | null>(null);
  const [descEditProduct, setDescEditProduct] = useState<SupplierProduct | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  // Quick price adjustment
  const handleQuickPrice = async (offerId: string, delta: number) => {
    const result = await supplierApi.bulkUpdatePrice({
      offerIds: [offerId],
      operation: delta > 0 ? 'INCREASE' : 'DECREASE',
      value: Math.abs(delta),
    });
    if (result.updated > 0) {
      showToast(`가격 ${delta > 0 ? '+' : ''}${delta.toLocaleString()}원 적용`);
      await fetchProducts(pagination.page);
    }
  };

  // Bulk price apply
  const handleBulkApply = async (operation: string, value: number) => {
    setBulkApplying(true);
    const result = await supplierApi.bulkUpdatePrice({
      offerIds: Array.from(selectedIds),
      operation: operation as any,
      value,
    });
    setBulkApplying(false);
    setShowBulkModal(false);
    showToast(`${result.updated}건 가격 변경 완료${result.failed.length > 0 ? ` (${result.failed.length}건 실패)` : ''}`);
    setSelectedIds(new Set());
    await fetchProducts(pagination.page);
  };

  // Column with checkbox, image, description, quick price
  const enhancedColumns = useMemo(() => {
    const selectCol: ListColumnDef<SupplierProduct> = {
      key: '_select' as any,
      header: '' as any,
      width: '40px',
      align: 'center',
      render: (_v: any, row: SupplierProduct) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleSelect(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 accent-blue-600 cursor-pointer"
        />
      ),
    };

    const imageCol: ListColumnDef<SupplierProduct> = {
      key: 'primaryImageUrl' as any,
      header: '이미지',
      width: '70px',
      align: 'center',
      render: (v: any, row: SupplierProduct) =>
        v ? (
          <img src={v} alt="" className="w-10 h-10 rounded object-cover mx-auto" />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setImageUploadMasterId(row.masterId); }}
            className="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600"
            title="이미지 추가"
          >
            <ImagePlus size={18} />
          </button>
        ),
    };

    const descCol: ListColumnDef<SupplierProduct> = {
      key: 'consumerShortDescription' as any,
      header: '설명',
      width: '70px',
      align: 'center',
      render: (v: any, row: SupplierProduct) =>
        v ? (
          <button
            onClick={(e) => { e.stopPropagation(); setDescEditProduct(row); }}
            className="text-xs text-green-600 hover:underline"
          >
            수정
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setDescEditProduct(row); }}
            className="text-xs text-red-500 hover:underline font-medium"
          >
            미작성
          </button>
        ),
    };

    // Insert name column with group indicator
    const cols = baseColumns.map((col) => {
      if (col.key === 'name') {
        return {
          ...col,
          render: (v: any, row: SupplierProduct, index: number) => {
            const isGroupStart = index === 0 || row.masterId !== products[index - 1]?.masterId;
            const groupSize = products.filter((p) => p.masterId === row.masterId).length;
            return (
              <div>
                {isGroupStart && groupSize > 1 && (
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium mr-1">
                    {groupSize} Offers
                  </span>
                )}
                <span className={`font-medium ${!isGroupStart && groupSize > 1 ? 'pl-2 text-slate-500' : ''}`}>
                  {v || '-'}
                </span>
              </div>
            );
          },
        };
      }
      // Enhance priceGeneral with quick +/- buttons
      if (col.key === 'priceGeneral') {
        return {
          ...col,
          render: (v: any, row: SupplierProduct) => (
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); handleQuickPrice(row.id, -500); }}
                className="text-xs text-red-500 hover:bg-red-50 px-1 rounded"
                title="-500원"
              >
                -5
              </button>
              <span>{v != null ? `${Number(v).toLocaleString()}` : '-'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleQuickPrice(row.id, 500); }}
                className="text-xs text-blue-500 hover:bg-blue-50 px-1 rounded"
                title="+500원"
              >
                +5
              </button>
            </div>
          ),
        };
      }
      return col;
    });

    // Insert imageCol after categoryName
    const catIdx = cols.findIndex((c) => c.key === 'categoryName');
    if (catIdx >= 0) cols.splice(catIdx + 1, 0, imageCol);

    // Insert descCol after consumerReferencePrice
    const refPriceIdx = cols.findIndex((c) => c.key === 'consumerReferencePrice');
    if (refPriceIdx >= 0) cols.splice(refPriceIdx + 1, 0, descCol);

    return [selectCol, ...cols];
  }, [products, selectedIds]);

  const handleGenerateAiTags = async (masterId: string) => {
    setGeneratingTagFor(masterId);
    await productApi.regenerateAiTags(masterId);
    setTimeout(() => {
      fetchProducts(pagination.page);
      setGeneratingTagFor(null);
    }, 2000);
  };

  const fetchProducts = useCallback(async (page = 1, searchKeyword?: string) => {
    setLoading(true);
    const kw = searchKeyword !== undefined ? searchKeyword : keyword;
    const result = await supplierApi.getProductsPaginated({
      page,
      limit: 50,
      keyword: kw || undefined,
      hasImage: filterHasImage || undefined,
      hasDescription: filterHasDescription || undefined,
      barcodeSource: filterBarcodeSource || undefined,
    });
    setProducts(result.data);
    setPagination(result.pagination);
    setSelectedIds(new Set());
    setLoading(false);
  }, [keyword, filterHasImage, filterHasDescription, filterBarcodeSource]);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  const handleSearch = useCallback((value: string) => {
    fetchProducts(1, value);
  }, [fetchProducts]);

  const handleSave = async (changedRows: SupplierProduct[]) => {
    setSaving(true);
    const updates = changedRows.map((r) => ({
      offerId: r.id,
      isActive: r.isActive,
      distributionType: r.distributionType,
      priceGeneral: r.priceGeneral != null ? Number(r.priceGeneral) : undefined,
      consumerReferencePrice: r.consumerReferencePrice != null ? Number(r.consumerReferencePrice) : null,
    }));
    await supplierApi.batchUpdateProducts(updates);
    await fetchProducts(pagination.page);
    setSaving(false);
  };

  // Filter toggle helpers
  const toggleFilter = (setter: React.Dispatch<React.SetStateAction<string>>, value: string, current: string) => {
    setter(current === value ? '' : value);
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">내 제품 관리</h1>
          <p className="text-sm text-slate-500 mt-1">
            공급하는 제품을 관리하고, 가격 및 유통 정책을 설정합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/supplier/products/library')}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
          >
            <Search size={16} />
            라이브러리 검색
          </button>
          <button
            onClick={() => navigate('/supplier/products/new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            <Plus size={16} />
            상품 등록
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3">
        <SearchBar
          value={keyword}
          onChange={setKeyword}
          onSearch={handleSearch}
          placeholder="바코드, 상품명으로 검색"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        <FilterChip label="이미지 없음" active={filterHasImage === 'false'} onClick={() => toggleFilter(setFilterHasImage, 'false', filterHasImage)} />
        <FilterChip label="설명 없음" active={filterHasDescription === 'false'} onClick={() => toggleFilter(setFilterHasDescription, 'false', filterHasDescription)} />
        <FilterChip label="INTERNAL 상품" active={filterBarcodeSource === 'INTERNAL'} onClick={() => toggleFilter(setFilterBarcodeSource, 'INTERNAL', filterBarcodeSource)} />
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-700 font-medium">{selectedIds.size}개 선택</span>
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
          >
            일괄 가격 변경
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded"
          >
            선택 해제
          </button>
        </div>
      )}

      {/* Table */}
      <EditableDataTable
        columns={[
          ...enhancedColumns,
          {
            key: 'masterId' as any,
            header: 'AI',
            width: '50px',
            align: 'center',
            render: (_v: string, row: SupplierProduct) => (
              <button
                onClick={(e) => { e.stopPropagation(); handleGenerateAiTags(row.masterId); }}
                disabled={generatingTagFor === row.masterId}
                className="p-1 rounded hover:bg-blue-50 text-blue-600 disabled:opacity-50 disabled:animate-pulse"
                title="AI 태그 생성"
              >
                <Sparkles size={14} />
              </button>
            ),
          } as any,
        ]}
        data={products}
        rowKey="id"
        loading={loading}
        emptyMessage="등록된 제품이 없습니다"
        onSave={handleSave}
        saving={saving}
      />

      {/* Pagination */}
      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={(p) => fetchProducts(p)}
      />

      {/* Select All hint */}
      {products.length > 0 && (
        <div className="mt-2 text-center">
          <button onClick={toggleSelectAll} className="text-xs text-slate-400 hover:text-slate-600">
            {selectedIds.size === products.length ? '전체 선택 해제' : '전체 선택'}
          </button>
        </div>
      )}

      {/* Modals */}
      {showBulkModal && (
        <BulkPriceModal
          count={selectedIds.size}
          onClose={() => setShowBulkModal(false)}
          onApply={handleBulkApply}
          applying={bulkApplying}
        />
      )}
      {imageUploadMasterId && (
        <ImageUploadModal
          masterId={imageUploadMasterId}
          onClose={() => setImageUploadMasterId(null)}
          onUploaded={() => { setImageUploadMasterId(null); fetchProducts(pagination.page); }}
        />
      )}
      {descEditProduct && (
        <DescriptionEditModal
          product={descEditProduct}
          onClose={() => setDescEditProduct(null)}
          onSaved={() => { setDescEditProduct(null); fetchProducts(pagination.page); }}
        />
      )}
    </div>
  );
}

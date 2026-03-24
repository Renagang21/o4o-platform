/**
 * SupplierProductsPage — 엑셀형 공급자 제품 관리
 *
 * WO-NETURE-SUPPLIER-EXCEL-LIST-V1
 *
 * EditableDataTable 기반. 다건 인라인 편집 + batch 저장.
 * 검색/정렬/페이지네이션 지원.
 *
 * 편집 가능: 공급가, 소비자가, 유통타입, 활성
 * 편집 불가: 바코드, 상품명, 카테고리, 브랜드, 상태, 승인
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Sparkles } from 'lucide-react';
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

// ─── Column definitions ───

const columns: ListColumnDef<SupplierProduct>[] = [
  {
    key: 'barcode',
    header: '바코드',
    width: '120px',
    render: (v) => <span className="font-mono text-xs">{v || '-'}</span>,
  },
  {
    key: 'name',
    header: '상품명',
    width: '200px',
    render: (v) => <span className="font-medium">{v || '-'}</span>,
  },
  {
    key: 'categoryName',
    header: '카테고리',
    width: '120px',
    render: (v) => v || '-',
  },
  {
    key: 'brandName',
    header: '브랜드',
    width: '100px',
    render: (v) => v || '-',
  },
  {
    key: 'priceGeneral',
    header: '공급가',
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
    width: '100px',
    align: 'center',
    editable: true,
    render: (v) => {
      const isPrivate = v === 'PRIVATE';
      return (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${isPrivate ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
          {isPrivate ? '비공개' : '공개'}
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
        <option value="PUBLIC">공개</option>
        <option value="PRIVATE">비공개</option>
      </select>
    ),
  },
  {
    key: 'isActive',
    header: '활성',
    width: '70px',
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
    width: '90px',
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
    width: '70px',
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
    key: 'serviceApprovals',
    header: '서비스 승인',
    width: '180px',
    render: (v: Array<{ serviceKey: string; status: string }> | undefined | null) => {
      const approvals = Array.isArray(v) ? v : [];
      if (approvals.length === 0) return <span className="text-xs text-slate-400">-</span>;
      const colorMap: Record<string, string> = {
        pending: 'bg-amber-50 text-amber-700',
        approved: 'bg-green-50 text-green-700',
        rejected: 'bg-red-50 text-red-700',
      };
      return (
        <div className="flex flex-wrap gap-1">
          {approvals.map((a, i) => (
            <span key={i} className={`text-xs px-1.5 py-0.5 rounded font-medium ${colorMap[a.status] || 'bg-slate-100 text-slate-600'}`}>
              {a.serviceKey}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    key: 'tags',
    header: '태그',
    width: '180px',
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

  const handleGenerateAiTags = async (masterId: string) => {
    setGeneratingTagFor(masterId);
    await productApi.regenerateAiTags(masterId);
    // 태그 생성은 fire-and-forget이므로 약간의 딜레이 후 새로고침
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
    });
    setProducts(result.data);
    setPagination(result.pagination);
    setLoading(false);
  }, [keyword]);

  useEffect(() => {
    fetchProducts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div>
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
      <div className="mb-4">
        <SearchBar
          value={keyword}
          onChange={setKeyword}
          onSearch={handleSearch}
          placeholder="바코드, 상품명으로 검색"
        />
      </div>

      {/* Table */}
      <EditableDataTable
        columns={[
          ...columns,
          {
            key: 'masterId' as any,
            header: 'AI',
            width: '60px',
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
    </div>
  );
}

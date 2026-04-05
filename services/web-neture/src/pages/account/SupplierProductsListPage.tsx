/**
 * SupplierProductsListPage - 공급자 상품 관리 (테이블 뷰)
 *
 * WO-O4O-SUPPLIER-PRODUCTS-PAGE-V1
 *
 * 구성:
 * - Toolbar: 검색 + 카테고리 필터 + 상태 필터 + 상품 등록 버튼
 * - Table: 이미지 / 상품명 / 브랜드 / 카테고리 / 규격 / 공급가 / 소비자참고가 / 상태 / 관리
 * - Mobile Cards: 반응형 카드 뷰
 * - Inline Price Edit: 공급가 클릭 → 수정 → 저장
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { supplierApi, supplierProfileApi, type SupplierProduct } from '../../lib/api';

// ============================================================================
// HUB Visibility Status
// ============================================================================

type HubStatus = 'visible' | 'inactive' | 'pending' | 'rejected' | 'supplier_inactive';

interface HubStatusConfig {
  label: string;
  bg: string;
  color: string;
  hint?: string;
}

const HUB_STATUS_MAP: Record<HubStatus, HubStatusConfig> = {
  visible:            { label: 'HUB 노출',      bg: '#dcfce7', color: '#059669' },
  inactive:           { label: '비활성',          bg: '#f1f5f9', color: '#64748b', hint: '활성화 후 HUB 노출' },
  pending:            { label: '승인 대기',       bg: '#fefce8', color: '#ca8a04' },
  rejected:           { label: '승인 거절',       bg: '#fef2f2', color: '#dc2626' },
  supplier_inactive:  { label: '공급자 미활성',   bg: '#e2e8f0', color: '#475569', hint: '공급자 계정 활성화 필요' },
};

function getHubStatus(product: SupplierProduct, supplierStatus?: string): HubStatus {
  if (supplierStatus && supplierStatus !== 'active' && supplierStatus !== 'approved') {
    return 'supplier_inactive';
  }
  if (product.approvalStatus === 'REJECTED') return 'rejected';
  if (product.approvalStatus === 'PENDING') return 'pending';
  if (!product.isActive) return 'inactive';
  return 'visible';
}

function HubStatusBadge({ product, supplierStatus }: { product: SupplierProduct; supplierStatus?: string }) {
  const hubStatus = getHubStatus(product, supplierStatus);
  const config = HUB_STATUS_MAP[hubStatus];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ ...styles.badge, backgroundColor: config.bg, color: config.color, fontSize: '10px', padding: '1px 6px' }}>
        {config.label}
      </span>
      {config.hint && (
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>{config.hint}</span>
      )}
    </span>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatPrice(value: number | null | undefined): string {
  if (value == null || value === 0) return '-';
  return value.toLocaleString('ko-KR');
}

type StatusInfo = { label: string; bg: string; color: string };

function getStatusInfo(product: SupplierProduct): StatusInfo {
  const status = product.approvalStatus;
  if (status === 'REJECTED') return { label: '거절됨', bg: '#fef2f2', color: '#dc2626' };
  if (status === 'PENDING') return { label: '승인대기', bg: '#fefce8', color: '#ca8a04' };
  // APPROVED
  if (product.isActive) return { label: 'Active', bg: '#dcfce7', color: '#15803d' };
  return { label: 'Inactive', bg: '#f1f5f9', color: '#64748b' };
}

// ============================================================================
// Status Badge
// ============================================================================

function StatusBadge({ product, supplierStatus }: { product: SupplierProduct; supplierStatus?: string }) {
  const info = getStatusInfo(product);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
      <span style={{ ...styles.badge, backgroundColor: info.bg, color: info.color }}>
        {info.label}
      </span>
      <HubStatusBadge product={product} supplierStatus={supplierStatus} />
    </div>
  );
}

// ============================================================================
// Product Image
// ============================================================================

function ProductThumbnail({ src }: { src: string | null }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={styles.thumbnail}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div style={styles.thumbnailPlaceholder}>
      <Package size={16} style={{ color: '#94a3b8' }} />
    </div>
  );
}

// ============================================================================
// Inline Price Editor
// ============================================================================

function InlinePrice({
  value,
  productId,
  onSave,
}: {
  value: number;
  productId: string;
  onSave: (id: string, price: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const num = Number(editValue);
    if (!num || num <= 0 || num === value) {
      setEditing(false);
      setEditValue(String(value));
      return;
    }
    setSaving(true);
    await onSave(productId, num);
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') { setEditing(false); setEditValue(String(value)); }
        }}
        disabled={saving}
        autoFocus
        style={styles.priceInput}
        min="0"
      />
    );
  }

  return (
    <span
      onClick={() => { setEditing(true); setEditValue(String(value)); }}
      style={styles.priceClickable}
      title="클릭하여 수정"
    >
      {formatPrice(value)}
    </span>
  );
}

// ============================================================================
// Toolbar
// ============================================================================

interface ToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  categories: string[];
  status: string;
  onStatusChange: (v: string) => void;
}

function Toolbar(props: ToolbarProps) {
  const { search, onSearchChange, category, onCategoryChange, categories, status, onStatusChange } = props;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[320px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="상품명, 바코드, 브랜드 검색..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Category Filter */}
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
      >
        <option value="">카테고리 전체</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* Status Filter */}
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
      >
        <option value="">상태 전체</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="pending">승인대기</option>
        <option value="rejected">거절됨</option>
      </select>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Add Product */}
      <Link
        to="/supplier/products/new"
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 whitespace-nowrap"
      >
        <Plus size={16} />
        상품 추가
      </Link>
    </div>
  );
}

// ============================================================================
// Product Table (Desktop)
// ============================================================================

function ProductTable({
  products,
  onToggleActive,
  onSavePrice,
  togglingId,
  supplierStatus,
}: {
  products: SupplierProduct[];
  onToggleActive: (id: string, current: boolean) => void;
  onSavePrice: (id: string, price: number) => Promise<void>;
  togglingId: string | null;
  supplierStatus?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[56px]" />
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">상품명</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">브랜드</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">카테고리</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">규격</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">공급가</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">소비자참고가</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">상태</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[80px]">관리</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const isToggling = togglingId === p.id;
            return (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                {/* Image */}
                <td className="px-4 py-3">
                  <ProductThumbnail src={p.primaryImageUrl} />
                </td>
                {/* Product Name */}
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800 truncate max-w-[200px]">
                    {p.masterName || p.name || '-'}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{p.barcode}</div>
                </td>
                {/* Brand */}
                <td className="px-4 py-3 text-slate-600">{p.brandName || '-'}</td>
                {/* Category */}
                <td className="px-4 py-3 text-slate-600">{p.categoryName || p.category || '-'}</td>
                {/* Spec */}
                <td className="px-4 py-3 text-slate-500 text-xs">{p.specification || '-'}</td>
                {/* Price General (inline edit) */}
                <td className="px-4 py-3 text-right font-mono text-slate-800">
                  <InlinePrice value={p.priceGeneral} productId={p.id} onSave={onSavePrice} />
                </td>
                {/* Consumer Price */}
                <td className="px-4 py-3 text-right font-mono text-slate-500">
                  {formatPrice(p.consumerReferencePrice)}
                </td>
                {/* Status */}
                <td className="px-4 py-3 text-center">
                  <StatusBadge product={p} supplierStatus={supplierStatus} />
                </td>
                {/* Actions */}
                <td className="px-4 py-3 text-center">
                  {p.approvalStatus === 'APPROVED' && (
                    <button
                      onClick={() => onToggleActive(p.id, p.isActive)}
                      disabled={isToggling}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-50"
                      title={p.isActive ? '비활성화' : '활성화'}
                    >
                      {p.isActive ? (
                        <ToggleRight size={22} className="text-green-600" />
                      ) : (
                        <ToggleLeft size={22} className="text-slate-400" />
                      )}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Product Cards (Mobile)
// ============================================================================

function ProductCards({
  products,
  onToggleActive,
  onSavePrice,
  togglingId,
  supplierStatus,
}: {
  products: SupplierProduct[];
  onToggleActive: (id: string, current: boolean) => void;
  onSavePrice: (id: string, price: number) => Promise<void>;
  togglingId: string | null;
  supplierStatus?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {products.map((p) => {
        const isToggling = togglingId === p.id;
        return (
          <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex gap-3">
              {/* Image */}
              <ProductThumbnail src={p.primaryImageUrl} />
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-slate-800 truncate">
                    {p.masterName || p.name || '-'}
                  </div>
                  <StatusBadge product={p} supplierStatus={supplierStatus} />
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {[p.brandName, p.categoryName || p.category].filter(Boolean).join(' · ') || '-'}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-sm">
                    <span className="text-slate-500">공급가: </span>
                    <span className="font-mono font-medium text-slate-800">
                      <InlinePrice value={p.priceGeneral} productId={p.id} onSave={onSavePrice} />
                    </span>
                  </div>
                  {p.approvalStatus === 'APPROVED' && (
                    <button
                      onClick={() => onToggleActive(p.id, p.isActive)}
                      disabled={isToggling}
                      className="p-1"
                    >
                      {p.isActive ? (
                        <ToggleRight size={24} className="text-green-600" />
                      ) : (
                        <ToggleLeft size={24} className="text-slate-400" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
      <Package size={48} className="mx-auto text-slate-300 mb-3" />
      <p className="text-sm text-slate-500 mb-4">등록된 상품이 없습니다.</p>
      <Link
        to="/supplier/products/new"
        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
      >
        <Plus size={16} />
        상품 등록
      </Link>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SupplierProductsListPage() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [supplierStatus, setSupplierStatus] = useState<string | undefined>();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const data = await supplierApi.getProducts();
        setProducts(data);
      } catch {
        // non-critical
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  // Fetch supplier profile to get supplier status
  useEffect(() => {
    supplierProfileApi.getProfile().then((profile) => {
      if (profile?.status) setSupplierStatus(profile.status);
    }).catch(() => {});
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(
      products.map((p) => p.categoryName || p.category).filter(Boolean)
    );
    return Array.from(cats).sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const searchable = [p.masterName, p.name, p.barcode, p.brandName].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      // Category filter
      if (category && (p.categoryName || p.category) !== category) return false;
      // Status filter
      if (status) {
        if (status === 'active' && !(p.approvalStatus === 'APPROVED' && p.isActive)) return false;
        if (status === 'inactive' && !(p.approvalStatus === 'APPROVED' && !p.isActive)) return false;
        if (status === 'pending' && p.approvalStatus !== 'PENDING') return false;
        if (status === 'rejected' && p.approvalStatus !== 'REJECTED') return false;
      }
      return true;
    });
  }, [products, search, category, status]);

  const hubVisibleCount = useMemo(() => {
    return filtered.filter((p) => getHubStatus(p, supplierStatus) === 'visible').length;
  }, [filtered, supplierStatus]);

  const handleToggleActive = useCallback(async (id: string, currentValue: boolean) => {
    setTogglingId(id);
    const result = await supplierApi.updateProduct(id, { isActive: !currentValue });
    if (result.success) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: !currentValue } : p))
      );
    }
    setTogglingId(null);
  }, []);

  const handleSavePrice = useCallback(async (id: string, price: number) => {
    const result = await supplierApi.updateProduct(id, { priceGeneral: price });
    if (result.success) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, priceGeneral: price } : p))
      );
    }
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Products</h1>
        <p className="text-sm text-slate-500 mt-1">상품을 등록하고 공급 조건을 관리합니다.</p>
      </div>

      {/* Toolbar */}
      <Toolbar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        categories={categories}
        status={status}
        onStatusChange={setStatus}
      />

      {/* HUB Info Chip */}
      {!loading && products.length > 0 && (
        <div style={styles.infoChip}>
          <span style={{ flexShrink: 0 }}>ℹ️</span>
          약국 HUB에는 활성화된 승인 완료 상품만 노출됩니다. 이 화면의 전체 상품 수와 HUB 노출 수는 다를 수 있습니다.
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-sm text-slate-500">로딩 중...</div>
      ) : filtered.length === 0 && products.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-sm text-slate-400">검색 결과가 없습니다.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <ProductTable
              products={filtered}
              onToggleActive={handleToggleActive}
              onSavePrice={handleSavePrice}
              togglingId={togglingId}
              supplierStatus={supplierStatus}
            />
          </div>
          {/* Mobile Cards */}
          <div className="block md:hidden">
            <ProductCards
              products={filtered}
              onToggleActive={handleToggleActive}
              onSavePrice={handleSavePrice}
              togglingId={togglingId}
              supplierStatus={supplierStatus}
            />
          </div>
          {/* Count */}
          <div className="mt-3 text-xs text-slate-400 text-right">
            {filtered.length === products.length
              ? `총 ${products.length}개 상품 · HUB 노출 ${hubVisibleCount}개`
              : `${filtered.length} / ${products.length}개 상품 · HUB 노출 ${hubVisibleCount}개`}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Inline Styles (for non-Tailwind elements)
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  infoChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    marginBottom: '16px',
    fontSize: '12px',
    color: '#94a3b8',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  thumbnail: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    objectFit: 'cover',
    border: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  thumbnailPlaceholder: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  priceInput: {
    width: '90px',
    padding: '4px 8px',
    fontSize: '13px',
    fontFamily: 'monospace',
    border: '1px solid #3b82f6',
    borderRadius: '4px',
    outline: 'none',
    textAlign: 'right',
    backgroundColor: '#eff6ff',
  },
  priceClickable: {
    cursor: 'pointer',
    borderBottom: '1px dashed #94a3b8',
    paddingBottom: '1px',
  },
};

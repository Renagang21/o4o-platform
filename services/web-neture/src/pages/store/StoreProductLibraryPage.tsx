/**
 * StoreProductLibraryPage - 매장 제품 라이브러리 검색 + 진열
 *
 * WO-O4O-STORE-PRODUCT-LIBRARY-INTEGRATION-V1
 * - ProductMaster 텍스트 검색 (이름/바코드/제조사)
 * - 카테고리/브랜드 필터
 * - 진열하기 → Offer 선택 모달 → Store Listing 생성
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, ArrowLeft, ChevronLeft, ChevronRight, Store, X, Truck } from 'lucide-react';
import {
  storeApi,
  productApi,
  type StoreProductSearchResult,
  type StoreOfferItem,
  type CategoryTreeItem,
  type BrandItem,
} from '../../lib/api';
import SupplierConditionModal from '../../components/common/SupplierConditionModal';

function flattenCategories(
  categories: CategoryTreeItem[],
  depth = 0,
): { id: string; name: string; depth: number }[] {
  const result: { id: string; name: string; depth: number }[] = [];
  for (const cat of categories) {
    result.push({ id: cat.id, name: cat.name, depth });
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategories(cat.children, depth + 1));
    }
  }
  return result;
}

function formatPrice(value: number): string {
  return value.toLocaleString('ko-KR');
}

// ── Offer Selection Modal ──────────────────────────────────────────────

function OfferModal({
  master,
  offers,
  loading,
  onSelect,
  onShowCondition,
  onClose,
}: {
  master: StoreProductSearchResult;
  offers: StoreOfferItem[];
  loading: boolean;
  onSelect: (offerId: string) => void;
  onShowCondition: (supplierId: string, supplierName: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 text-sm truncate">
              공급자 선택
            </h3>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {master.marketingName || master.regulatoryName}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">공급자 정보 로딩 중...</div>
          ) : offers.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              현재 이용 가능한 공급자가 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="border border-slate-100 rounded-lg p-3 hover:border-emerald-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onShowCondition(offer.supplierId, offer.supplierName)}
                        className="font-medium text-slate-800 text-sm text-left hover:text-primary-600 hover:underline"
                      >
                        {offer.supplierName}
                      </button>
                      {offer.brandName && (
                        <p className="text-xs text-blue-600 mt-0.5">{offer.brandName}</p>
                      )}
                      {/* Price tiers */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-emerald-700 font-semibold text-sm">
                          ₩{formatPrice(offer.priceGeneral)}
                        </span>
                        {offer.priceGold != null && (
                          <span className="text-xs text-amber-600">서비스 ₩{formatPrice(offer.priceGold)}</span>
                        )}
                        {/* WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1: 스팟가는 별도 정책으로 이동 */}
                        <span className="inline-block px-1.5 py-0.5 text-xs bg-slate-100 text-slate-500 rounded">
                          <Truck size={10} className="inline mr-0.5" />
                          {offer.distributionType === 'PUBLIC' ? '공개' : '비공개'}
                        </span>
                      </div>
                      {/* Descriptions — WO-NETURE-B2B-CONTENT-MANAGEMENT-V1: backend COALESCE fallback */}
                      {offer.effectiveShortDescription && (
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{offer.effectiveShortDescription}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onSelect(offer.id)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors whitespace-nowrap flex-shrink-0"
                    >
                      진열하기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function StoreProductLibraryPage() {
  const navigate = useNavigate();

  // Search state
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [page, setPage] = useState(1);

  // Results
  const [results, setResults] = useState<StoreProductSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  // Reference data
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);

  // Offer modal
  const [selectedMaster, setSelectedMaster] = useState<StoreProductSearchResult | null>(null);
  const [offers, setOffers] = useState<StoreOfferItem[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);

  // Message
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Supplier condition modal — WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
  const [conditionTarget, setConditionTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    productApi.getCategories().then(setCategories);
    productApi.getBrands().then(setBrands);
  }, []);

  const flatCats = flattenCategories(categories);

  const doSearch = useCallback(async (p: number) => {
    setLoading(true);
    const res = await storeApi.searchProducts({
      q: query.trim() || undefined,
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      page: p,
      limit: 20,
    });
    setResults(res.data);
    setTotal(res.meta.total);
    setTotalPages(res.meta.totalPages);
    setPage(p);
    setLoading(false);
  }, [query, categoryId, brandId]);

  useEffect(() => { doSearch(1); }, []);
  useEffect(() => { doSearch(1); }, [categoryId, brandId]);

  const handleSearch = () => doSearch(1);

  const handleListProduct = async (master: StoreProductSearchResult) => {
    if (master.offerCount === 0) {
      setMessage({ type: 'error', text: '이 상품에는 현재 이용 가능한 공급자가 없습니다.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    // Load offers
    setSelectedMaster(master);
    setOffersLoading(true);
    const offerList = await storeApi.getMasterOffers(master.id);
    setOffers(offerList);
    setOffersLoading(false);

    // If only 1 offer, auto-select
    if (offerList.length === 1) {
      await handleSelectOffer(offerList[0].id);
      setSelectedMaster(null);
    }
  };

  const handleSelectOffer = async (offerId: string) => {
    const result = await storeApi.createListing({ offerId });
    if (result.success) {
      const msg = result.message === 'ALREADY_LISTED' ? '이미 진열된 상품입니다.' : '매장에 진열되었습니다!';
      setMessage({ type: 'success', text: msg });
    } else {
      setMessage({ type: 'error', text: result.error || '진열에 실패했습니다.' });
    }
    setSelectedMaster(null);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/store/manage/products')}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft size={16} />
          내 매장 제품으로 돌아가기
        </button>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Store size={24} />
          제품 라이브러리
        </h1>
        <p className="text-slate-500 mt-1">
          플랫폼에 등록된 상품을 검색하여 매장에 진열합니다
        </p>
      </div>

      {/* Message banner */}
      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="상품명, 바코드, 제조사로 검색..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium text-sm"
        >
          검색
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">전체 카테고리</option>
          {flatCats.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {'  '.repeat(cat.depth)}{cat.name}
            </option>
          ))}
        </select>
        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">전체 브랜드</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <span className="flex items-center text-sm text-slate-500">
          {total}개 상품
        </span>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="text-slate-400 text-sm">검색 중...</div>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <Package size={48} className="mb-4 opacity-50" />
          <p className="text-sm">검색 결과가 없습니다</p>
          <p className="text-xs mt-1">다른 키워드로 검색해보세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((master) => (
            <div
              key={master.id}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex gap-4 hover:border-emerald-200 transition-colors"
            >
              {/* Image */}
              <div className="w-20 h-20 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {master.primaryImageUrl ? (
                  <img
                    src={master.primaryImageUrl}
                    alt={master.marketingName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package size={24} className="text-slate-300" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 text-sm truncate">
                  {master.marketingName || master.regulatoryName}
                </h3>
                {master.marketingName && master.regulatoryName !== master.marketingName && (
                  <p className="text-xs text-slate-400 truncate">{master.regulatoryName}</p>
                )}
                <p className="text-xs font-mono text-slate-500 mt-1">{master.barcode}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {master.category && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                      {master.category.name}
                    </span>
                  )}
                  {master.brand && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                      {master.brand.name}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{master.manufacturerName}</span>
                  {master.offerCount > 0 && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-emerald-50 text-emerald-600 rounded">
                      공급자 {master.offerCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="flex-shrink-0 flex items-center">
                <button
                  onClick={() => handleListProduct(master)}
                  disabled={master.offerCount === 0}
                  className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  진열하기
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => doSearch(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-slate-600 px-4">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => doSearch(page + 1)}
            disabled={page >= totalPages}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Offer Modal */}
      {selectedMaster && (
        <OfferModal
          master={selectedMaster}
          offers={offers}
          loading={offersLoading}
          onSelect={handleSelectOffer}
          onShowCondition={(supplierId, supplierName) => setConditionTarget({ id: supplierId, name: supplierName })}
          onClose={() => setSelectedMaster(null)}
        />
      )}

      {/* Supplier condition modal — WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1 */}
      <SupplierConditionModal
        open={!!conditionTarget}
        supplierId={conditionTarget?.id ?? null}
        fallbackName={conditionTarget?.name}
        onClose={() => setConditionTarget(null)}
      />
    </div>
  );
}

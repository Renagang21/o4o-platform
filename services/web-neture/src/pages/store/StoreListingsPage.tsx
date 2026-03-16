/**
 * StoreListingsPage - 내 매장 제품 관리
 *
 * WO-O4O-STORE-PRODUCT-LIBRARY-INTEGRATION-V1
 * - 진열 목록 조회 (마스터+공급자+이미지 JOIN)
 * - 활성/비활성 토글
 * - 매장가 수정
 * - 라이브러리 검색 페이지 링크
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Package, Search, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  storeApi,
  type StoreListingItem,
} from '../../lib/api';

function formatPrice(value: number | null): string {
  if (value == null) return '-';
  return '₩' + value.toLocaleString('ko-KR');
}

export default function StoreListingsPage() {
  const navigate = useNavigate();

  const [listings, setListings] = useState<StoreListingItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  // Message
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchListings = useCallback(async (p: number) => {
    setLoading(true);
    const res = await storeApi.getMyListings({ page: p, limit: 20 });
    setListings(res.data);
    setTotal(res.meta.total);
    setTotalPages(res.meta.totalPages);
    setPage(p);
    setLoading(false);
  }, []);

  useEffect(() => { fetchListings(1); }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleToggleActive = async (listing: StoreListingItem) => {
    const result = await storeApi.updateListing(listing.id, { isActive: !listing.isActive });
    if (result.success) {
      setListings((prev) => prev.map((l) =>
        l.id === listing.id ? { ...l, isActive: !l.isActive } : l
      ));
      showMessage('success', listing.isActive ? '비활성 처리되었습니다.' : '활성화되었습니다.');
    } else {
      showMessage('error', result.error || '변경에 실패했습니다.');
    }
  };

  const handleStartEditPrice = (listing: StoreListingItem) => {
    setEditingId(listing.id);
    setEditPrice(listing.price != null ? String(listing.price) : '');
  };

  const handleSavePrice = async (listing: StoreListingItem) => {
    const priceVal = editPrice.trim() === '' ? null : Number(editPrice);
    if (priceVal !== null && (isNaN(priceVal) || priceVal < 0)) {
      showMessage('error', '올바른 가격을 입력해주세요.');
      return;
    }
    const result = await storeApi.updateListing(listing.id, { price: priceVal });
    if (result.success) {
      setListings((prev) => prev.map((l) =>
        l.id === listing.id ? { ...l, price: priceVal } : l
      ));
      showMessage('success', '가격이 저장되었습니다.');
    } else {
      showMessage('error', result.error || '저장에 실패했습니다.');
    }
    setEditingId(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Store size={24} />
            내 매장 제품
          </h1>
          <p className="text-slate-500 mt-1">
            진열된 제품 {total}개
          </p>
        </div>
        <button
          onClick={() => navigate('/store/manage/products/library')}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm"
        >
          <Search size={16} />
          라이브러리 검색
        </button>
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

      {/* Listings */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="text-slate-400 text-sm">로딩 중...</div>
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <Package size={48} className="mb-4 opacity-50" />
          <p className="text-sm">진열된 제품이 없습니다</p>
          <p className="text-xs mt-1">라이브러리에서 상품을 검색하여 진열해보세요</p>
          <button
            onClick={() => navigate('/store/manage/products/library')}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
          >
            라이브러리 검색
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className={`bg-white rounded-xl border shadow-sm p-4 flex gap-4 transition-colors ${
                listing.isActive ? 'border-slate-100' : 'border-slate-200 opacity-60'
              }`}
            >
              {/* Image */}
              <div className="w-16 h-16 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {listing.primaryImage ? (
                  <img
                    src={listing.primaryImage}
                    alt={listing.marketingName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package size={20} className="text-slate-300" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 text-sm truncate">
                  {listing.marketingName || listing.regulatoryName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{listing.barcode} · {listing.manufacturerName}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-xs text-slate-500">
                    공급: {listing.supplierName} · {formatPrice(listing.offerPrice)}
                  </span>
                  <span className="inline-block px-1.5 py-0.5 text-xs bg-slate-100 text-slate-500 rounded">
                    {listing.distributionType === 'PUBLIC' ? '공개' : '비공개'}
                  </span>
                </div>
              </div>

              {/* Price edit */}
              <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                {editingId === listing.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSavePrice(listing)}
                      placeholder="매장가"
                      className="w-24 px-2 py-1 border border-emerald-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSavePrice(listing)}
                      className="px-2 py-1 bg-emerald-600 text-white rounded text-xs"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 text-slate-400 text-xs hover:text-slate-600"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartEditPrice(listing)}
                    className="text-sm font-medium text-slate-700 hover:text-emerald-700 transition-colors"
                    title="클릭하여 매장가 수정"
                  >
                    매장가: {listing.price != null ? formatPrice(listing.price) : '미설정'}
                  </button>
                )}

                {/* Active toggle */}
                <button
                  onClick={() => handleToggleActive(listing)}
                  className={`flex items-center gap-1 text-xs font-medium ${
                    listing.isActive ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                  title={listing.isActive ? '비활성화하기' : '활성화하기'}
                >
                  {listing.isActive ? (
                    <><ToggleRight size={18} /> 활성</>
                  ) : (
                    <><ToggleLeft size={18} /> 비활성</>
                  )}
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
            onClick={() => fetchListings(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-slate-600 px-4">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => fetchListings(page + 1)}
            disabled={page >= totalPages}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

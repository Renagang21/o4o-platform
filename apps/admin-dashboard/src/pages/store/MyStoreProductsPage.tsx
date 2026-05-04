/**
 * MyStoreProductsPage — 내 매장 상품 관리
 *
 * WO-O4O-STORE-PRODUCT-REGISTRATION-PHASE1-V1
 * WO-O4O-STORE-PRODUCT-REGISTRATION-PHASE1-5-V1 (페이지네이션 + 채널 토글)
 *
 * 경로: /store/my-products
 */

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import { toast } from 'react-hot-toast';
import {
  Plus, Search, RefreshCw, Package, ChevronRight,
  ToggleLeft, ToggleRight, Pencil, X, Tv2, ShoppingCart,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import {
  searchStoreProducts,
  getMasterOffers,
  createStoreListing,
  getMyStoreListings,
  updateStoreListing,
  updateListingDescription,
  getMyChannels,
  getChannelProducts,
  addProductToChannel,
  toggleChannelProduct,
} from '../../api/store-products.api';
import type {
  StoreListingItem,
  StoreProductSearchResult,
  StoreProductOffer,
  StoreChannel,
  ChannelProductItem,
} from '../../api/store-products.api';

// ── 상수 ──────────────────────────────────────────────────────────────────────

const CHANNEL_LABEL: Record<string, string> = { B2C: 'B2C', KIOSK: '키오스크' };
const CHANNEL_ICON: Record<string, typeof ShoppingCart> = {
  B2C: ShoppingCart,
  KIOSK: Tv2,
};

const PAGE_SIZE = 20;

// ── 등록 모달 (3-step) ────────────────────────────────────────────────────────

type RegisterStep = 'search' | 'offer' | 'confirm';

function RegisterModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<RegisterStep>('search');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StoreProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState<StoreProductSearchResult | null>(null);
  const [offers, setOffers] = useState<StoreProductOffer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<StoreProductOffer | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchStoreProducts(value.trim(), 1, 20);
        setSearchResults(res.data ?? []);
      } catch {
        toast.error('검색 중 오류가 발생했습니다.');
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const handleSelectMaster = async (master: StoreProductSearchResult) => {
    setSelectedMaster(master);
    setStep('offer');
    setIsLoadingOffers(true);
    try {
      setOffers(await getMasterOffers(master.id));
    } catch {
      toast.error('공급 제안 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingOffers(false);
    }
  };

  const handleRegister = async () => {
    if (!selectedOffer) return;
    setIsSubmitting(true);
    try {
      const price = priceInput.trim() ? Number(priceInput.trim()) : undefined;
      const res = await createStoreListing(selectedOffer.id, price);
      if (res.success) {
        if (res.message === 'ALREADY_LISTED') {
          toast('이미 등록된 상품입니다.', { icon: 'ℹ️' });
        } else {
          toast.success('매장 상품으로 등록되었습니다.');
        }
        onSuccess();
        onClose();
      } else {
        toast.error('등록 중 오류가 발생했습니다.');
      }
    } catch {
      toast.error('등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">상품 등록</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 'search' && '상품명 또는 바코드로 검색하세요.'}
              {step === 'offer' && `"${selectedMaster?.name}" 공급 제안을 선택하세요.`}
              {step === 'confirm' && '등록 가격을 설정하고 확인하세요.'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-5 py-2 text-xs text-gray-400 border-b">
          <span className={step === 'search' ? 'font-semibold text-blue-600' : ''}>1. 상품 검색</span>
          <ChevronRight size={12} />
          <span className={step === 'offer' ? 'font-semibold text-blue-600' : ''}>2. 공급 제안 선택</span>
          <ChevronRight size={12} />
          <span className={step === 'confirm' ? 'font-semibold text-blue-600' : ''}>3. 등록 확인</span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 'search' && (
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="상품명 또는 바코드 입력..."
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
              {isSearching && <p className="text-center text-xs text-gray-400 py-4">검색 중...</p>}
              {!isSearching && query.trim() && searchResults.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-4">검색 결과가 없습니다.</p>
              )}
              {!isSearching && searchResults.length > 0 && (
                <ul className="space-y-1.5">
                  {searchResults.map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => handleSelectMaster(m)}
                        className="w-full flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        {m.primaryImageUrl ? (
                          <img src={m.primaryImageUrl} alt={m.name} className="h-10 w-10 flex-shrink-0 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 flex-shrink-0 rounded bg-gray-200 flex items-center justify-center">
                            <Package size={16} className="text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                          <p className="text-xs text-gray-500">{m.manufacturerName} · 바코드: {m.barcode}</p>
                        </div>
                        <span className={`flex-shrink-0 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.offerCount > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {m.offerCount > 0 ? `공급 ${m.offerCount}건` : '공급 없음'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {step === 'offer' && (
            <div className="space-y-3">
              <button onClick={() => setStep('search')} className="text-xs text-blue-600 hover:underline">← 다시 검색</button>
              {isLoadingOffers && <p className="text-center text-xs text-gray-400 py-4">조회 중...</p>}
              {!isLoadingOffers && offers.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  공급 제안이 없는 상품입니다. 공급자가 제안을 등록한 후 추가할 수 있습니다.
                </div>
              )}
              {!isLoadingOffers && offers.length > 0 && (
                <ul className="space-y-2">
                  {offers.map((offer) => (
                    <li key={offer.id}>
                      <button
                        onClick={() => { setSelectedOffer(offer); setStep('confirm'); }}
                        className="w-full rounded-lg border border-gray-100 bg-gray-50 p-4 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{offer.supplierName}</p>
                            {offer.effectiveShortDescription && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{offer.effectiveShortDescription}</p>
                            )}
                          </div>
                          <p className="flex-shrink-0 text-sm font-semibold text-gray-900">
                            {offer.priceGeneral.toLocaleString()}원
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {step === 'confirm' && selectedMaster && selectedOffer && (
            <div className="space-y-4">
              <button onClick={() => setStep('offer')} className="text-xs text-blue-600 hover:underline">← 공급 제안 다시 선택</button>
              <div className="rounded-lg border border-gray-200 p-4 space-y-1.5 text-sm">
                {[
                  ['상품명', selectedMaster.name],
                  ['제조사', selectedMaster.manufacturerName],
                  ['바코드', selectedMaster.barcode],
                  ['공급사', selectedOffer.supplierName],
                  ['공급가', `${selectedOffer.priceGeneral.toLocaleString()}원`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500">{k}</span>
                    <span className={k === '공급가' ? 'font-semibold text-gray-900' : 'text-gray-700 text-right max-w-[60%]'}>{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  매장 판매가 <span className="text-xs font-normal text-gray-400">(선택, 비워두면 공급가 사용)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder={`기본: ${selectedOffer.priceGeneral.toLocaleString()}원`}
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-5 py-4 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
          {step === 'confirm' && (
            <button onClick={handleRegister} disabled={isSubmitting} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? '등록 중...' : '매장 상품 등록'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 가격 수정 모달 ─────────────────────────────────────────────────────────────

function EditPriceModal({ listing, onClose, onSuccess }: { listing: StoreListingItem; onClose: () => void; onSuccess: () => void }) {
  const [price, setPrice] = useState(listing.price != null ? String(listing.price) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const newPrice = price.trim() ? Number(price.trim()) : null;
      const res = await updateStoreListing(listing.id, { price: newPrice });
      if (res.success) { toast.success('가격이 수정되었습니다.'); onSuccess(); onClose(); }
      else toast.error('저장 중 오류가 발생했습니다.');
    } catch { toast.error('저장 중 오류가 발생했습니다.'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">판매가 수정</h3>
        <p className="text-xs text-gray-500 mb-4">{listing.name}</p>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          매장 판매가 <span className="text-xs font-normal text-gray-400">(비워두면 공급가 적용)</span>
        </label>
        <input
          autoFocus type="number" min={0}
          placeholder={`공급가: ${listing.offerPrice.toLocaleString()}원`}
          value={price} onChange={(e) => setPrice(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 mb-5"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
          <button onClick={handleSave} disabled={isSubmitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 설명 수정 모달 ─────────────────────────────────────────────────────────────

function EditDescModal({ listing, onClose, onSuccess }: { listing: StoreListingItem; onClose: () => void; onSuccess: () => void }) {
  const [shortDesc, setShortDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!shortDesc.trim()) { toast.error('설명을 입력하세요.'); return; }
    setIsSubmitting(true);
    try {
      const res = await updateListingDescription(listing.offerId, { shortDescription: shortDesc.trim() });
      if (res.success) { toast.success('설명이 저장되었습니다.'); onSuccess(); onClose(); }
      else toast.error('저장 중 오류가 발생했습니다.');
    } catch { toast.error('저장 중 오류가 발생했습니다.'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">매장 설명 수정</h3>
        <p className="text-xs text-gray-500 mb-4">{listing.name}</p>
        <label className="block text-sm font-medium text-gray-700 mb-1">짧은 설명</label>
        <textarea
          autoFocus rows={3}
          placeholder="고객에게 표시될 짧은 설명을 입력하세요."
          value={shortDesc} onChange={(e) => setShortDesc(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 mb-5 resize-none"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
          <button onClick={handleSave} disabled={isSubmitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 채널 토글 모달 ─────────────────────────────────────────────────────────────

function ChannelToggleModal({
  listing,
  channels,
  onClose,
  onSuccess,
}: {
  listing: StoreListingItem;
  channels: StoreChannel[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  // 각 채널별 현재 등록 여부 + productChannelId 조회
  const [channelState, setChannelState] = useState<
    Record<string, { loaded: boolean; channelProductId: string | null; isActive: boolean }>
  >({});
  const [loadingChannelId, setLoadingChannelId] = useState<string | null>(null);

  // 채널별 상태 로드
  const loadChannelState = useCallback(async (channelId: string) => {
    setLoadingChannelId(channelId);
    try {
      const items = await getChannelProducts(channelId);
      const found = items.find((i) => i.productListingId === listing.id);
      setChannelState((prev) => ({
        ...prev,
        [channelId]: {
          loaded: true,
          channelProductId: found?.id ?? null,
          isActive: found?.isActive ?? false,
        },
      }));
    } catch {
      setChannelState((prev) => ({ ...prev, [channelId]: { loaded: true, channelProductId: null, isActive: false } }));
    } finally {
      setLoadingChannelId(null);
    }
  }, [listing.id]);

  // 최초 마운트 시 모든 채널 상태 로드
  useState(() => {
    channels.forEach((ch) => loadChannelState(ch.id));
  });

  const handleToggle = async (channel: StoreChannel) => {
    const state = channelState[channel.id];
    if (!state?.loaded) return;
    setLoadingChannelId(channel.id);
    try {
      if (!state.channelProductId) {
        // 등록
        const res = await addProductToChannel(channel.id, listing.id);
        if (res.success) {
          toast.success(`${CHANNEL_LABEL[channel.channelType] ?? channel.channelType} 채널에 추가되었습니다.`);
          onSuccess();
          await loadChannelState(channel.id);
        }
      } else {
        // 활성/비활성 토글
        const newActive = !state.isActive;
        await toggleChannelProduct(channel.id, state.channelProductId, newActive);
        toast.success(newActive ? '채널 노출이 활성화되었습니다.' : '채널 노출이 비활성화되었습니다.');
        setChannelState((prev) => ({
          ...prev,
          [channel.id]: { ...prev[channel.id], isActive: newActive },
        }));
        onSuccess();
      }
    } catch {
      toast.error('채널 상태 변경 중 오류가 발생했습니다.');
    } finally {
      setLoadingChannelId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">채널 노출 설정</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">{listing.name}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {channels.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">등록된 채널이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {channels.map((ch) => {
              const state = channelState[ch.id];
              const isLoading = loadingChannelId === ch.id;
              const isApproved = ch.status === 'APPROVED';
              const Icon = CHANNEL_ICON[ch.channelType] ?? ShoppingCart;

              return (
                <li key={ch.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className="text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {CHANNEL_LABEL[ch.channelType] ?? ch.channelType}
                      </p>
                      {!isApproved && (
                        <p className="text-xs text-amber-600">미승인 채널</p>
                      )}
                    </div>
                  </div>
                  {!state?.loaded || isLoading ? (
                    <span className="text-xs text-gray-400">로드 중...</span>
                  ) : !isApproved ? (
                    <span className="text-xs text-gray-400">등록 불가</span>
                  ) : (
                    <button
                      onClick={() => handleToggle(ch)}
                      disabled={isLoading}
                      className="flex items-center gap-1"
                    >
                      {state.channelProductId && state.isActive ? (
                        <ToggleRight size={24} className="text-blue-600" />
                      ) : (
                        <ToggleLeft size={24} className="text-gray-400" />
                      )}
                      <span className="text-xs text-gray-500">
                        {!state.channelProductId ? '미등록' : state.isActive ? '노출 중' : '비활성'}
                      </span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">닫기</button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────────

type ActiveModal = null | 'register' | 'price' | 'desc' | 'channel';

export default function MyStoreProductsPage() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedListing, setSelectedListing] = useState<StoreListingItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-store-listings', page],
    queryFn: () => getMyStoreListings(page, PAGE_SIZE),
  });

  const { data: channelsData } = useQuery({
    queryKey: ['my-store-channels'],
    queryFn: getMyChannels,
    staleTime: 5 * 60 * 1000,
  });

  const channels: StoreChannel[] = channelsData ?? [];

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateStoreListing(id, { isActive }),
    onMutate: ({ id }) => setTogglingId(id),
    onSuccess: (res, { isActive }) => {
      if (res.success) {
        toast.success(isActive ? '상품이 활성화되었습니다.' : '상품이 비활성화되었습니다.');
        queryClient.invalidateQueries({ queryKey: ['my-store-listings'] });
      }
    },
    onError: () => toast.error('상태 변경 중 오류가 발생했습니다.'),
    onSettled: () => setTogglingId(null),
  });

  const openModal = useCallback((modal: ActiveModal, listing?: StoreListingItem) => {
    if (listing) setSelectedListing(listing);
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setSelectedListing(null);
  }, []);

  const handleMutationSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['my-store-listings'] });
  }, [queryClient]);

  const columns: O4OColumn<StoreListingItem>[] = [
    {
      key: 'primaryImage',
      header: '',
      width: 52,
      render: (row) => row.primaryImage ? (
        <img src={row.primaryImage} alt={row.name} className="h-10 w-10 rounded object-cover" />
      ) : (
        <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
          <Package size={16} className="text-gray-300" />
        </div>
      ),
    },
    {
      key: 'name',
      header: '상품명',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{row.name}</p>
          <p className="text-xs text-gray-400">{row.barcode}</p>
        </div>
      ),
    },
    {
      key: 'manufacturerName',
      header: '제조사',
      width: 120,
      render: (row) => <span className="text-sm text-gray-600 truncate">{row.manufacturerName}</span>,
    },
    {
      key: 'offerPrice',
      header: '공급가',
      width: 100,
      render: (row) => <span className="text-sm text-gray-500">{row.offerPrice.toLocaleString()}원</span>,
    },
    {
      key: 'price',
      header: '판매가',
      width: 120,
      render: (row) => (
        <button
          onClick={() => openModal('price', row)}
          className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-blue-600 group"
        >
          {row.price != null ? `${row.price.toLocaleString()}원` : <span className="text-gray-400 text-xs">공급가 적용</span>}
          <Pencil size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
        </button>
      ),
    },
    {
      key: 'isActive',
      header: '활성',
      width: 70,
      render: (row) => (
        <button
          onClick={() => toggleMutation.mutate({ id: row.id, isActive: !row.isActive })}
          disabled={togglingId === row.id}
          className="disabled:opacity-40"
        >
          {row.isActive
            ? <ToggleRight size={24} className="text-blue-600" />
            : <ToggleLeft size={24} className="text-gray-400" />}
        </button>
      ),
    },
    {
      key: 'id',
      header: '채널/설명',
      width: 110,
      render: (row) => (
        <div className="flex gap-1">
          <button
            onClick={() => openModal('channel', row)}
            className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-blue-300 hover:text-blue-600"
            title="채널 노출"
          >
            <Tv2 size={11} />
            채널
          </button>
          <button
            onClick={() => openModal('desc', row)}
            className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-gray-300 hover:bg-gray-50"
            title="설명 수정"
          >
            <Pencil size={11} />
            설명
          </button>
        </div>
      ),
    },
  ];

  const listings = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="p-6">
      <PageHeader
        title="내 매장 상품"
        subtitle="진열 상품을 관리하고 채널별 노출을 제어하세요."
        actions={[
          {
            id: 'register',
            label: '상품 등록',
            icon: <Plus size={14} />,
            onClick: () => openModal('register'),
            variant: 'primary',
          },
          {
            id: 'refresh',
            label: '새로고침',
            icon: <RefreshCw size={14} />,
            onClick: () => refetch(),
          },
        ]}
      />

      <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
        <Package size={16} className="mt-0.5 flex-shrink-0 text-blue-500" />
        <p className="text-xs text-blue-800">
          공통 상품(ProductMaster)을 검색하여 매장 상품으로 등록하세요.
          공급 제안이 있는 상품만 등록 가능하며, 등록 후 채널별 노출을 개별 제어할 수 있습니다.
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : isError ? (
        <div className="rounded border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          데이터를 불러오는 중 오류가 발생했습니다.
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 py-16 gap-4">
          <Package size={36} className="text-gray-300" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">등록된 매장 상품이 없습니다.</p>
            <p className="text-xs text-gray-400 mt-1">'상품 등록' 버튼으로 공통 상품을 검색하여 추가하세요.</p>
          </div>
          <button
            onClick={() => openModal('register')}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={14} />
            첫 상품 등록하기
          </button>
        </div>
      ) : (
        <>
          <BaseTable<StoreListingItem>
            columns={columns}
            data={listings}
            emptyMessage="등록된 매장 상품이 없습니다."
          />

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                총 {meta?.total ?? 0}개 · {page} / {totalPages} 페이지
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  이전
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const pg = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page + i - 3;
                  if (pg < 1 || pg > totalPages) return null;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`rounded border px-3 py-1.5 text-xs ${
                        pg === page
                          ? 'border-blue-500 bg-blue-50 font-semibold text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            </div>
          )}

          {totalPages === 1 && meta && meta.total > 0 && (
            <p className="mt-3 text-xs text-gray-400 text-right">총 {meta.total}개 상품</p>
          )}
        </>
      )}

      {/* 모달들 */}
      {activeModal === 'register' && (
        <RegisterModal onClose={closeModal} onSuccess={handleMutationSuccess} />
      )}
      {activeModal === 'price' && selectedListing && (
        <EditPriceModal listing={selectedListing} onClose={closeModal} onSuccess={handleMutationSuccess} />
      )}
      {activeModal === 'desc' && selectedListing && (
        <EditDescModal listing={selectedListing} onClose={closeModal} onSuccess={handleMutationSuccess} />
      )}
      {activeModal === 'channel' && selectedListing && (
        <ChannelToggleModal
          listing={selectedListing}
          channels={channels}
          onClose={closeModal}
          onSuccess={handleMutationSuccess}
        />
      )}
    </div>
  );
}

/**
 * OperatorStoreDetailPage — 매장 상세 (채널 + Capabilities + 상품)
 *
 * WO-O4O-STORE-HUB-OPERATOR-INTEGRATION-V1:
 *   Operator HUB → Store HUB 연결.
 *   /api/v1/operator/stores/:storeId API 기반 매장 상세 조회.
 *   Capabilities 섹션 포함 (조회 + enable/disable toggle).
 *
 * WO-O4O-KPA-OPERATOR-LOAD-ERROR-AND-REMAINING-LISTS-CONSOLIDATED-V1:
 *   - 조회 계약 분리: 매장정보 / 채널 / 기능(capability) / 상품 4축 독립 로드·오류·재시도
 *   - 매장정보 실패만 상세 전체 차단, 나머지 섹션 실패는 섹션 오류만 표시
 *   - capability 조회 실패를 빈 목록으로 위장하지 않음 (섹션 오류 + 재시도)
 *   - capability 토글 실패 → 사용자 toast
 *   - 채널/상품(진짜 목록)만 DataTable, 카드형 정보/기능 UI는 카드 유지
 *   - 상품 더보기(page 기반) — 기존 API 계약(page/limit) 범위 내
 *
 * Bearer token auth (KPA — getAccessToken 사용).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { AlertTriangle } from 'lucide-react';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { ConfirmActionDialog } from '@o4o/ui';
import { getAccessToken } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const PRODUCT_PAGE_SIZE = 10;

// ─── Types ───

interface StoreDetail {
  id: string;
  name: string;
  code: string;
  type: string;
  isActive: boolean;
  address: string | null;
  addressDetail: { zipCode?: string; baseAddress: string; detailAddress?: string; region?: string } | null;
  phone: string | null;
  description: string | null;
  businessNumber: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  slug: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChannelData {
  id: string;
  channelType: string;
  status: string;
  approvedAt: string | null;
  approvedByName: string | null;
  createdAt: string;
}

interface CapabilityData {
  key: string;
  label: string;
  category: string;
  enabled: boolean;
  source: string;
}

interface StoreProduct {
  id: string;
  isActive: boolean;
  price: number | null;
  masterId: string;
  barcode: string;
  marketingName: string;
  primaryImage: string | null;
  offerPrice: number | null;
  distributionType: string | null;
  createdAt: string;
}

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
    throw new Error(body?.error || body?.message || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Constants ───

const channelLabel: Record<string, string> = {
  B2C: '온라인 스토어',
  KIOSK: '키오스크',
  TABLET: '태블릿',
  SIGNAGE: '사이니지',
};

const statusLabel: Record<string, { text: string; cls: string }> = {
  APPROVED: { text: '승인', cls: 'bg-green-100 text-green-700' },
  PENDING: { text: '대기', cls: 'bg-amber-100 text-amber-700' },
  REJECTED: { text: '거부', cls: 'bg-red-100 text-red-700' },
  SUSPENDED: { text: '정지', cls: 'bg-slate-100 text-slate-600' },
  EXPIRED: { text: '만료', cls: 'bg-slate-100 text-slate-500' },
  TERMINATED: { text: '해지', cls: 'bg-red-100 text-red-600' },
};

const typeLabel: Record<string, string> = { pharmacy: '약국', store: '매장', branch: '지점' };

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return '-';
  }
};

const formatPrice = (price: number | null) => {
  if (price === null || price === undefined) return '-';
  return `${price.toLocaleString()}원`;
};

// ─── Section-level error UI ───

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="py-8 text-center text-red-600">
      <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
      <p className="text-sm">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 px-4 py-1.5 text-xs text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
      >
        다시 시도
      </button>
    </div>
  );
}

function SectionLoading({ label }: { label: string }) {
  return (
    <div className="py-8 flex flex-col items-center gap-2 text-slate-400">
      <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs">{label}</p>
    </div>
  );
}

// ─── Component ───

export default function OperatorStoreDetailPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  // ── 매장 정보 (실패 시 전체 차단) ──
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeError, setStoreError] = useState<string | null>(null);

  // ── 채널 (섹션) ──
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [channelActionLoading, setChannelActionLoading] = useState<string | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<string | null>(null);

  // ── 기능 capability (섹션) ──
  const [capabilities, setCapabilities] = useState<CapabilityData[]>([]);
  const [capsLoading, setCapsLoading] = useState(true);
  const [capsError, setCapsError] = useState<string | null>(null);
  const [capabilityLoading, setCapabilityLoading] = useState<string | null>(null);

  // ── 상품 (섹션 + 더보기) ──
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [productPage, setProductPage] = useState(1);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsMoreLoading, setProductsMoreLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const loadStore = useCallback(async () => {
    if (!storeId) return;
    setStoreLoading(true);
    setStoreError(null);
    try {
      const data = await apiFetch<{ success: boolean; store: StoreDetail }>(`/api/v1/operator/stores/${storeId}`);
      if (data.success) setStore(data.store);
      else setStoreError('매장 정보를 불러올 수 없습니다');
    } catch (err: any) {
      setStoreError(err?.message || '매장 정보를 불러올 수 없습니다');
    } finally {
      setStoreLoading(false);
    }
  }, [storeId]);

  const loadChannels = useCallback(async () => {
    if (!storeId) return;
    setChannelsLoading(true);
    setChannelsError(null);
    try {
      const data = await apiFetch<{ success: boolean; channels: ChannelData[] }>(`/api/v1/operator/stores/${storeId}/channels`);
      setChannels(data.success ? data.channels : []);
      if (!data.success) setChannelsError('채널 정보를 불러올 수 없습니다');
    } catch (err: any) {
      setChannelsError(err?.message || '채널 정보를 불러올 수 없습니다');
    } finally {
      setChannelsLoading(false);
    }
  }, [storeId]);

  const loadCapabilities = useCallback(async () => {
    if (!storeId) return;
    setCapsLoading(true);
    setCapsError(null);
    try {
      // 조회 실패를 빈 목록으로 위장하지 않는다 — 섹션 오류로 표면화
      const data = await apiFetch<{ success: boolean; capabilities: CapabilityData[] }>(`/api/v1/operator/stores/${storeId}/capabilities`);
      if (data.success) setCapabilities(data.capabilities);
      else setCapsError('기능 정보를 불러올 수 없습니다');
    } catch (err: any) {
      setCapsError(err?.message || '기능 정보를 불러올 수 없습니다');
    } finally {
      setCapsLoading(false);
    }
  }, [storeId]);

  const loadProducts = useCallback(async (page: number, append: boolean) => {
    if (!storeId) return;
    if (append) setProductsMoreLoading(true);
    else setProductsLoading(true);
    setProductsError(null);
    try {
      const data = await apiFetch<{ success: boolean; products: StoreProduct[]; pagination: { total: number; totalPages: number } }>(
        `/api/v1/operator/stores/${storeId}/products?page=${page}&limit=${PRODUCT_PAGE_SIZE}`,
      );
      if (data.success) {
        setProducts((prev) => (append ? [...prev, ...data.products] : data.products));
        setProductTotal(data.pagination.total);
        setProductTotalPages(data.pagination.totalPages);
        setProductPage(page);
      } else {
        setProductsError('매장 상품을 불러올 수 없습니다');
      }
    } catch (err: any) {
      setProductsError(err?.message || '매장 상품을 불러올 수 없습니다');
    } finally {
      setProductsLoading(false);
      setProductsMoreLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    loadStore();
    loadChannels();
    loadCapabilities();
    loadProducts(1, false);
  }, [storeId, loadStore, loadChannels, loadCapabilities, loadProducts]);

  const handleToggleCapability = async (capKey: string, currentEnabled: boolean) => {
    if (!storeId) return;
    setCapabilityLoading(capKey);
    try {
      await apiFetch(`/api/v1/operator/stores/${storeId}/capabilities`, {
        method: 'PUT',
        body: JSON.stringify({ capabilities: [{ key: capKey, enabled: !currentEnabled }] }),
      });
      // 낙관적 갱신으로 즉시 반영하되, 서버 상태로 재조회하여 실제 결과와 동기화한다.
      // WO-O4O-KPA-OPERATOR-ACTION-INTEGRITY-AND-APPROVAL-FLOW-COMPLETION-V1:
      //   mutation 성공 후 목록을 서버에서 refetch — 낙관적 값이 서버 실제 상태와 어긋날 여지 제거.
      setCapabilities((prev) =>
        prev.map((c) => (c.key === capKey ? { ...c, enabled: !currentEnabled } : c)),
      );
      await loadCapabilities();
    } catch (err: any) {
      // 토글 실패는 사용자에게 toast 로 알린다 (조용히 무시 금지)
      toast.error(err?.message || '기능 상태 변경에 실패했습니다.');
    } finally {
      setCapabilityLoading(null);
    }
  };

  // WO-O4O-KPA-OPERATOR-P2-P3-USABILITY-AND-ERROR-CLEANUP-CONSOLIDATED-V1:
  //   채널 영구 종료(되돌릴 수 없음)의 window.confirm → ConfirmActionDialog(danger).
  //   TERMINATED 만 확인 게이트 대상, 나머지 전이는 즉시 적용.
  const handleChannelStatusChange = async (channelId: string, newStatus: string) => {
    if (!storeId) return;
    if (newStatus === 'TERMINATED') { setTerminateTarget(channelId); return; }
    await applyChannelStatus(channelId, newStatus);
  };

  const applyChannelStatus = async (channelId: string, newStatus: string) => {
    if (!storeId) return;
    setChannelActionLoading(channelId);
    try {
      await apiFetch(`/api/v1/operator/stores/${storeId}/channels/${channelId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      // WO-O4O-KPA-OPERATOR-ACTION-INTEGRITY-AND-APPROVAL-FLOW-COMPLETION-V1:
      //   낙관적 갱신 후 서버 상태로 refetch — 채널 상태가 서버 실제 전이 결과와 일치하도록 동기화.
      setChannels((prev) =>
        prev.map((c) => (c.id === channelId ? { ...c, status: newStatus } : c)),
      );
      await loadChannels();
    } catch (err: any) {
      toast.error(err?.message || '상태 변경에 실패했습니다.');
    } finally {
      setChannelActionLoading(null);
    }
  };

  const confirmTerminate = async () => {
    const id = terminateTarget;
    if (!id) return;
    setTerminateTarget(null);
    await applyChannelStatus(id, 'TERMINATED');
  };

  // ─── Column defs ───

  const channelColumns: ListColumnDef<ChannelData>[] = useMemo(() => [
    {
      key: 'channelType', header: '채널',
      render: (_v, ch) => <span className="text-sm font-medium text-slate-800">{channelLabel[ch.channelType] || ch.channelType}</span>,
    },
    {
      key: 'createdAt', header: '등록일', width: '130px',
      render: (_v, ch) => <span className="text-xs text-slate-500">{formatDate(ch.createdAt)}</span>,
    },
    {
      key: 'status', header: '상태', width: '90px', align: 'center',
      render: (_v, ch) => {
        const sl = statusLabel[ch.status] || { text: ch.status, cls: 'bg-slate-100 text-slate-600' };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sl.cls}`}>{sl.text}</span>;
      },
    },
    {
      key: '_actions', header: '액션', width: '220px', align: 'right', system: true,
      render: (_v, ch) => {
        if (ch.status === 'TERMINATED' || ch.status === 'EXPIRED') return <span className="text-xs text-slate-300">-</span>;
        const loading = channelActionLoading === ch.id;
        return (
          <div className="flex items-center justify-end gap-2">
            {ch.status === 'APPROVED' && (
              <button onClick={() => handleChannelStatusChange(ch.id, 'SUSPENDED')} disabled={loading} className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50">비활성화</button>
            )}
            {ch.status === 'SUSPENDED' && (
              <button onClick={() => handleChannelStatusChange(ch.id, 'APPROVED')} disabled={loading} className="px-2 py-1 text-xs rounded bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50">재활성화</button>
            )}
            {(ch.status === 'PENDING' || ch.status === 'REJECTED') && (
              <button onClick={() => handleChannelStatusChange(ch.id, 'APPROVED')} disabled={loading} className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50">승인</button>
            )}
            <button onClick={() => handleChannelStatusChange(ch.id, 'TERMINATED')} disabled={loading} className="px-2 py-1 text-xs rounded text-red-600 hover:bg-red-50 disabled:opacity-50">종료</button>
          </div>
        );
      },
    },
  ], [channelActionLoading]);

  const productColumns: ListColumnDef<StoreProduct>[] = useMemo(() => [
    {
      key: 'primaryImage', header: '이미지', width: '70px',
      render: (_v, p) => p.primaryImage
        ? <img src={p.primaryImage} alt={p.marketingName} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
        : <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 text-xs">N/A</div>,
    },
    { key: 'marketingName', header: '상품명', render: (_v, p) => <span className="text-sm font-medium text-slate-800">{p.marketingName}</span> },
    {
      key: 'barcode', header: '바코드', width: '160px',
      render: (_v, p) => <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">{p.barcode}</span>,
    },
    { key: 'price', header: '가격', width: '110px', align: 'right', render: (_v, p) => <span className="text-sm text-slate-700">{formatPrice(p.price ?? p.offerPrice)}</span> },
    { key: 'isActive', header: '활성', width: '70px', align: 'center', render: (_v, p) => p.isActive ? '✓' : '-' },
  ], []);

  // ─── Render ───

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">매장 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  // 매장 정보 실패만 상세 전체를 차단한다
  if (storeError || !store) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/operator/stores')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
        >
          ← 매장 목록으로
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-600" />
          <p className="text-red-700">{storeError || '매장을 찾을 수 없습니다'}</p>
          <button
            onClick={loadStore}
            className="mt-3 px-4 py-1.5 text-xs text-red-700 border border-red-300 rounded-lg hover:bg-red-100"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Title */}
      <div>
        <button
          onClick={() => navigate('/operator/stores')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 mb-4"
        >
          ← 매장 목록으로
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">{store.name}</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            store.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {store.isActive ? '활성' : '비활성'}
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">{typeLabel[store.type] || store.type}</p>
      </div>

      {/* Store Info (카드형 — DataTable 미적용) */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">매장 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
          <InfoRow label="매장명" value={store.name} />
          <InfoRow label="코드" value={store.code || '-'} mono />
          <InfoRow label="Slug" value={store.slug || '-'} mono />
          <InfoRow label="사업자번호" value={store.businessNumber || '-'} />
          <InfoRow label="주소" value={store.addressDetail ? [store.addressDetail.baseAddress, store.addressDetail.detailAddress].filter(Boolean).join(' ') : (store.address || '-')} />
          <InfoRow label="전화" value={store.phone || '-'} />
          <InfoRow label="운영자" value={store.ownerName || '-'} />
          <InfoRow label="운영자 이메일" value={store.ownerEmail || '-'} />
          <InfoRow label="등록일" value={formatDate(store.createdAt)} />
          <InfoRow label="수정일" value={formatDate(store.updatedAt)} />
        </div>
        {store.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-1">설명</p>
            <p className="text-sm text-slate-700">{store.description}</p>
          </div>
        )}
      </div>

      {/* Channels (진짜 목록 — DataTable) */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          채널 상태 <span className="text-sm font-normal text-slate-400">({channels.length})</span>
        </h2>
        {channelsError ? (
          <SectionError message={channelsError} onRetry={loadChannels} />
        ) : (
          <DataTable<ChannelData>
            columns={channelColumns}
            data={channels}
            rowKey="id"
            loading={channelsLoading}
            emptyMessage="등록된 채널이 없습니다"
            tableId="operator-store-channels"
          />
        )}
      </div>

      {/* Capabilities (카드형 — DataTable 미적용) */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          기능 (Capabilities) <span className="text-sm font-normal text-slate-400">({capabilities.length})</span>
        </h2>
        {capsLoading ? (
          <SectionLoading label="기능 로딩 중..." />
        ) : capsError ? (
          // 실패를 빈 목록으로 위장하지 않는다
          <SectionError message={capsError} onRetry={loadCapabilities} />
        ) : capabilities.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">설정된 기능이 없습니다</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {capabilities.map((cap) => (
              <div key={cap.key} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">{cap.label || cap.key}</p>
                  <p className="text-xs text-slate-400">{cap.key} · {cap.source}</p>
                </div>
                <button
                  onClick={() => handleToggleCapability(cap.key, cap.enabled)}
                  disabled={capabilityLoading === cap.key}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    cap.enabled ? 'bg-green-500' : 'bg-slate-300'
                  } ${capabilityLoading === cap.key ? 'opacity-50' : ''}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    cap.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Products (진짜 목록 — DataTable + 더보기) */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          매장 상품 <span className="text-sm font-normal text-slate-400">({productTotal})</span>
        </h2>
        {productsError ? (
          <SectionError message={productsError} onRetry={() => loadProducts(1, false)} />
        ) : (
          <>
            <DataTable<StoreProduct>
              columns={productColumns}
              data={products}
              rowKey="id"
              loading={productsLoading}
              emptyMessage="등록된 상품이 없습니다"
              tableId="operator-store-products"
            />
            {productPage < productTotalPages && (
              <div className="flex justify-center pt-4 border-t border-slate-100 mt-2">
                <button
                  onClick={() => loadProducts(productPage + 1, true)}
                  disabled={productsMoreLoading}
                  className="px-4 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  {productsMoreLoading ? '불러오는 중...' : `더보기 (${products.length}/${productTotal})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmActionDialog
        open={!!terminateTarget}
        title="채널 영구 종료"
        message="이 채널을 영구 종료하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        variant="danger"
        confirmText="영구 종료"
        loading={!!channelActionLoading}
        onConfirm={confirmTerminate}
        onClose={() => setTerminateTarget(null)}
      />
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-sm text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

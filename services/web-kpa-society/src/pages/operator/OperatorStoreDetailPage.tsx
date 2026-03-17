/**
 * OperatorStoreDetailPage — 매장 상세 (채널 + Capabilities + 상품)
 *
 * WO-O4O-STORE-HUB-OPERATOR-INTEGRATION-V1:
 *   Operator HUB → Store HUB 연결.
 *   /api/v1/operator/stores/:storeId API 기반 매장 상세 조회.
 *   Capabilities 섹션 포함 (조회 + enable/disable toggle).
 *
 * Bearer token auth (KPA — getAccessToken 사용).
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { getAccessToken } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// ─── Types ───

interface StoreDetail {
  id: string;
  name: string;
  code: string;
  type: string;
  isActive: boolean;
  address: string | null;
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

// ─── Component ───

export default function OperatorStoreDetailPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  const [store, setStore] = useState<StoreDetail | null>(null);
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [capabilities, setCapabilities] = useState<CapabilityData[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capabilityLoading, setCapabilityLoading] = useState<string | null>(null);
  const [channelActionLoading, setChannelActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [detailData, channelData, capabilityData, productData] = await Promise.all([
          apiFetch<{ success: boolean; store: StoreDetail }>(`/api/v1/operator/stores/${storeId}`),
          apiFetch<{ success: boolean; channels: ChannelData[] }>(`/api/v1/operator/stores/${storeId}/channels`),
          apiFetch<{ success: boolean; capabilities: CapabilityData[] }>(`/api/v1/operator/stores/${storeId}/capabilities`).catch(() => ({ success: false, capabilities: [] })),
          apiFetch<{ success: boolean; products: StoreProduct[]; pagination: { total: number } }>(`/api/v1/operator/stores/${storeId}/products?limit=10`),
        ]);

        if (detailData.success) setStore(detailData.store);
        if (channelData.success) setChannels(channelData.channels);
        if (capabilityData.success) setCapabilities(capabilityData.capabilities);
        if (productData.success) {
          setProducts(productData.products);
          setProductTotal(productData.pagination.total);
        }
      } catch (err: any) {
        console.error('Failed to load store detail:', err);
        setError(err?.message || '매장 정보를 불러올 수 없습니다');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [storeId]);

  const handleToggleCapability = async (capKey: string, currentEnabled: boolean) => {
    if (!storeId) return;
    setCapabilityLoading(capKey);
    try {
      await apiFetch(`/api/v1/operator/stores/${storeId}/capabilities`, {
        method: 'PUT',
        body: JSON.stringify({ capabilities: [{ key: capKey, enabled: !currentEnabled }] }),
      });
      setCapabilities((prev) =>
        prev.map((c) => (c.key === capKey ? { ...c, enabled: !currentEnabled } : c)),
      );
    } catch (err) {
      console.error('Failed to toggle capability:', err);
    } finally {
      setCapabilityLoading(null);
    }
  };

  const handleChannelStatusChange = async (channelId: string, newStatus: string) => {
    if (!storeId) return;
    if (newStatus === 'TERMINATED' && !window.confirm('이 채널을 영구 종료하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    setChannelActionLoading(channelId);
    try {
      await apiFetch(`/api/v1/operator/stores/${storeId}/channels/${channelId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      setChannels((prev) =>
        prev.map((c) => (c.id === channelId ? { ...c, status: newStatus } : c)),
      );
    } catch (err: any) {
      toast.error(err?.message || '상태 변경에 실패했습니다.');
    } finally {
      setChannelActionLoading(null);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">매장 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/operator/stores')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
        >
          ← 매장 목록으로
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || '매장을 찾을 수 없습니다'}</p>
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

      {/* Store Info */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">매장 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
          <InfoRow label="매장명" value={store.name} />
          <InfoRow label="코드" value={store.code || '-'} mono />
          <InfoRow label="Slug" value={store.slug || '-'} mono />
          <InfoRow label="사업자번호" value={store.businessNumber || '-'} />
          <InfoRow label="주소" value={store.address || '-'} />
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

      {/* Channels */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          채널 상태 <span className="text-sm font-normal text-slate-400">({channels.length})</span>
        </h2>
        {channels.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">등록된 채널이 없습니다</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {channels.map((ch) => {
              const sl = statusLabel[ch.status] || { text: ch.status, cls: 'bg-slate-100 text-slate-600' };
              const loading = channelActionLoading === ch.id;
              return (
                <div key={ch.id} className="p-4 rounded-lg border border-slate-100 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{channelLabel[ch.channelType] || ch.channelType}</p>
                      <p className="text-xs text-slate-400">{formatDate(ch.createdAt)}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sl.cls}`}>
                      {sl.text}
                    </span>
                  </div>
                  {ch.status !== 'TERMINATED' && ch.status !== 'EXPIRED' && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Capabilities */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          기능 (Capabilities) <span className="text-sm font-normal text-slate-400">({capabilities.length})</span>
        </h2>
        {capabilities.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">설정된 기능이 없습니다</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {capabilities.map((cap) => (
              <div key={cap.key} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {cap.label || cap.key}
                  </p>
                  <p className="text-xs text-slate-400">
                    {cap.key} · {cap.source}
                  </p>
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

      {/* Products */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          매장 상품 <span className="text-sm font-normal text-slate-400">({productTotal})</span>
        </h2>
        {products.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">등록된 상품이 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">이미지</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">상품명</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">바코드</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">가격</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">활성</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      {p.primaryImage ? (
                        <img src={p.primaryImage} alt={p.marketingName} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 text-xs">N/A</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{p.marketingName}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">{p.barcode}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-700">{formatPrice(p.price || p.offerPrice)}</td>
                    <td className="px-4 py-3 text-center text-sm">
                      {p.isActive ? '✓' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {productTotal > 10 && (
              <p className="text-xs text-slate-400 text-center py-3 border-t border-slate-100">
                최근 10개만 표시 (전체 {productTotal}개)
              </p>
            )}
          </div>
        )}
      </div>
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

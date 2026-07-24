/**
 * SellerRecruitmentsBrowsePage (KPA) — 판매자 모집 (매장 경영자 조회)
 *
 * WO-O4O-KPA-SELLER-RECRUITMENT-STORE-CONSUMER-BROWSE-UI-V1
 *
 * 서비스 운영자가 노출 승인한(exposure_status='approved', status='recruiting') KPA 판매자 모집을
 * 매장 경영자(kpa:store_owner)가 조회하고 참여 신청한다.
 *
 * - 목록: apiClient(/api/v1/kpa) → GET /store/seller-recruitments
 *     (backend 가 serviceKey='kpa-society' · approved · recruiting 을 고정 — 프론트 필터 의존 없음)
 * - 참여: coreApiClient(/api/v1) → POST /neture/partner/applications { recruitmentId }
 *     (backend 가 NOT_EXPOSED/CLOSED/DUPLICATE 강제)
 * - 이미 신청: coreApiClient → GET /neture/partner/applications/mine
 * - 상세: 목록 데이터로 modal 구성(별도 상세 API 없음 — 운영자 검토 정보 미노출).
 */
import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Search, RefreshCw, X } from 'lucide-react';
import { apiClient, coreApiClient } from '../../api/client';

interface SellerRecruitment {
  id: string;
  productId: string;
  productName: string;
  manufacturer: string;
  consumerPrice: number;
  commissionRate: number;
  sellerId: string;
  sellerName: string;
  shopUrl: string;
  serviceName: string;
  serviceId: string;
  imageUrl: string;
  status: 'recruiting' | 'closed';
  exposureStatus: string;
  createdAt: string;
}

interface MyApplication {
  recruitmentId?: string;
  recruitment_id?: string;
}

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

export default function SellerRecruitmentsBrowsePage() {
  const [items, setItems] = useState<SellerRecruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<SellerRecruitment | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const [listRes, mineRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: SellerRecruitment[] }>('/store/seller-recruitments'),
        coreApiClient
          .get<{ success: boolean; data: MyApplication[] }>('/neture/partner/applications/mine')
          .catch(() => null),
      ]);
      setItems(listRes?.data ?? []);
      const applied = new Set<string>();
      for (const a of mineRes?.data ?? []) {
        const rid = a.recruitmentId ?? a.recruitment_id;
        if (rid) applied.add(rid);
      }
      setAppliedIds(applied);
    } catch {
      setApiError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = items.filter((p) => {
    if (!searchTerm) return true;
    const kw = searchTerm.toLowerCase();
    return (
      p.productName.toLowerCase().includes(kw) ||
      p.manufacturer.toLowerCase().includes(kw) ||
      p.sellerName.toLowerCase().includes(kw)
    );
  });

  const handleApply = async (recruitmentId: string) => {
    setApplyingId(recruitmentId);
    try {
      await coreApiClient.post('/neture/partner/applications', { recruitmentId });
      setAppliedIds((prev) => new Set(prev).add(recruitmentId));
      showToast('참여 신청이 완료되었습니다. 신청·승인 현황에서 확인할 수 있습니다.');
    } catch (e: any) {
      const code = e?.response?.data?.error || e?.data?.error || e?.code;
      if (code === 'DUPLICATE_APPLICATION') {
        setAppliedIds((prev) => new Set(prev).add(recruitmentId));
        showToast('이미 신청한 모집입니다.');
      } else if (code === 'RECRUITMENT_CLOSED') {
        showToast('마감된 모집입니다.');
        void load();
      } else if (code === 'RECRUITMENT_NOT_EXPOSED') {
        showToast('현재 참여할 수 없는 모집입니다.');
        void load();
      } else {
        showToast('신청에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">판매자 모집</h1>
          <p className="mt-1 text-sm text-gray-600">
            공급자가 등록하고 서비스 운영자가 승인한 판매자 모집입니다. 조건을 확인하고 참여를 신청하세요.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* Search */}
      <div className="my-6 flex">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="제품명, 제조사, 공급자 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-emerald-500 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-gray-400" />
          <p className="text-gray-500">불러오는 중...</p>
        </div>
      ) : apiError ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="mb-2 text-lg text-red-500">데이터를 불러올 수 없습니다</p>
          <p className="mb-4 text-sm text-gray-400">잠시 후 다시 시도해 주세요.</p>
          <button onClick={load} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">
            다시 시도
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-lg text-gray-500">현재 참여 가능한 판매자 모집이 없습니다.</p>
          <p className="mt-1 text-sm text-gray-400">새로운 모집이 승인되면 이 화면에서 확인할 수 있습니다.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="w-16 px-4 py-3 text-left font-medium text-gray-600">이미지</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">제품명</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">제조사</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">소비자가</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">수수료</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">공급자</th>
                  <th className="w-40 px-4 py-3 text-center font-medium text-gray-600">참여</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-gray-100">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.productName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs text-gray-400">IMG</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setDetail(p)}
                          className="text-left font-medium text-gray-900 hover:text-emerald-700 hover:underline"
                        >
                          {p.productName}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.manufacturer || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-gray-900">
                        {formatPrice(p.consumerPrice)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          {p.commissionRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{p.sellerName}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetail(p)}
                            className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                          >
                            상세
                          </button>
                          {appliedIds.has(p.id) ? (
                            <span className="text-xs font-medium text-green-600">신청 완료</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleApply(p.id)}
                              disabled={applyingId === p.id}
                              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {applyingId === p.id ? '신청 중...' : '참여 신청'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400">
        참여 신청 후 공급자가 승인하면 신청·승인 현황에서 확인할 수 있습니다.
      </p>

      {/* 상세 모달 (목록 데이터 재사용 — 별도 API 없음, 운영자 검토 정보 미노출) */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetail(null)}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">{detail.productName}</h2>
              <button type="button" onClick={() => setDetail(null)} className="shrink-0 text-gray-400 hover:text-gray-600" aria-label="닫기">
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                {detail.imageUrl ? (
                  <img src={detail.imageUrl} alt={detail.productName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">IMG</span>
                )}
              </div>
              <dl className="flex-1 space-y-1.5 text-sm">
                <div className="flex gap-2"><dt className="w-20 shrink-0 text-gray-500">제조사</dt><dd className="text-gray-800">{detail.manufacturer || '-'}</dd></div>
                <div className="flex gap-2"><dt className="w-20 shrink-0 text-gray-500">공급자</dt><dd className="text-gray-800">{detail.sellerName}</dd></div>
                <div className="flex gap-2"><dt className="w-20 shrink-0 text-gray-500">소비자가</dt><dd className="font-medium text-gray-900">{formatPrice(detail.consumerPrice)}</dd></div>
                <div className="flex gap-2"><dt className="w-20 shrink-0 text-gray-500">수수료</dt><dd className="text-gray-800">{detail.commissionRate}%</dd></div>
                {detail.shopUrl && (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-gray-500">몰 URL</dt>
                    <dd>
                      <a href={detail.shopUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800">
                        방문 <ExternalLink className="h-3 w-3" />
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDetail(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
                닫기
              </button>
              {appliedIds.has(detail.id) ? (
                <span className="rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700">신청 완료</span>
              ) : (
                <button
                  type="button"
                  onClick={() => { handleApply(detail.id); setDetail(null); }}
                  disabled={applyingId === detail.id}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  참여 신청
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

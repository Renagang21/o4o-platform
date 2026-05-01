/**
 * SupplierEventOfferPage — 공급자 이벤트 오퍼 현황 + 제안
 *
 * WO-O4O-EVENT-OFFER-NETURE-ROLE-UX-ALIGNMENT-V1
 * WO-O4O-EVENT-OFFER-SUPPLIER-UI-V1: "이벤트 제안" 진입점 추가
 *
 * Neture는 Event Offer의 "지원 허브"이다 (DOC-O4O-EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1).
 * 이 화면은 공급자 관점의 등록 현황 확인 + 제안 화면이며,
 * "매장 상품 확보" 또는 "참여/구매" 흐름을 포함하지 않는다.
 *
 * 역할:
 * - 등록된 이벤트 오퍼 현황 조회 (상태 / 수량 / 기간)
 * - 공급자가 제안한 상품의 노출 상태 확인
 * - 운영 관리 연결 (operator 승인 흐름과 연결)
 * - 신규: 자기 SPO 중에서 KPA 이벤트로 제안 (POST /kpa/supplier/event-offers)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, ChevronLeft, ChevronRight, Package, Plus, X, Loader2 } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { netureEventOfferApi, supplierKpaEventOfferApi } from '../../lib/api';
import type { ProposableOffer, MyEventOfferProposal, PerServiceProposalResult } from '../../lib/api';

// WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
// 대상 서비스 선택 옵션. backend의 TARGET_TO_EVENT_OFFER_KEY와 정합.
// GlycoPharm은 backend event offer 컨텍스트 미정의 → disabled.
type ProposeTarget = {
  key: string;
  label: string;
  enabled: boolean;
  hint?: string;
};
const PROPOSE_TARGETS: ProposeTarget[] = [
  { key: 'kpa-society', label: 'KPA Society', enabled: true },
  { key: 'k-cosmetics', label: 'K-Cosmetics', enabled: true },
  { key: 'glycopharm',  label: 'GlycoPharm',  enabled: false, hint: '준비 중' },
];

const TARGET_LABEL: Record<string, string> = {
  'kpa-society': 'KPA Society',
  'k-cosmetics': 'K-Cosmetics',
  'glycopharm':  'GlycoPharm',
  // event-offer service keys (status display용 fallback)
  'kpa-groupbuy':            'KPA Society',
  'k-cosmetics-event-offer': 'K-Cosmetics',
};

// WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
// 응답 service_key (kpa-groupbuy 등) → UI 라벨로 매핑.
const EVENT_KEY_TO_LABEL: Record<string, string> = {
  'kpa-groupbuy':            'KPA Society',
  'k-cosmetics-event-offer': 'K-Cosmetics',
};

const PROPOSAL_STATUS_MESSAGE: Record<string, string> = {
  created:           '제안되었습니다.',
  already_proposed:  '이미 제안된 상품입니다.',
  offer_not_found:   '공급자 상품을 찾을 수 없습니다.',
  offer_not_owned:   '권한이 없습니다.',
  org_unavailable:   '대상 서비스의 조직 정보를 확인할 수 없습니다.',
  unsupported:       '지원되지 않는 서비스입니다.',
  internal_error:    '처리 중 오류가 발생했습니다.',
};

type StatusTab = 'active' | 'ended' | 'all';

interface OfferItem {
  id: string;
  offerId: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  unitPrice: number | null;
  productName: string;
  supplierName: string;
  totalQuantity: number | null;
  perOrderLimit: number | null;
  perStoreLimit: number | null;
}

function formatPrice(value: number | null): string {
  if (value == null) return '-';
  return '₩' + value.toLocaleString('ko-KR');
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active:   { label: '진행중',  cls: 'bg-green-100 text-green-700' },
  ended:    { label: '종료',    cls: 'bg-slate-100 text-slate-500' },
  approved: { label: '승인됨',  cls: 'bg-blue-100 text-blue-700' },
  pending:  { label: '검토중',  cls: 'bg-yellow-100 text-yellow-700' },
  // WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1
  rejected: { label: '반려',    cls: 'bg-red-100 text-red-700' },
  canceled: { label: '취소',    cls: 'bg-red-100 text-red-500' },
};

// WO-O4O-EVENT-OFFER-SUPPLIER-UI-V1: 서버 에러 코드 → 사용자 메시지 매핑
const PROPOSE_ERROR_MESSAGES: Record<string, string> = {
  ALREADY_PROPOSED: '이미 제안된 이벤트 상품입니다.',
  OFFER_NOT_OWNED: '해당 상품에 대한 권한이 없습니다.',
  OFFER_NOT_FOUND: '공급자 상품을 찾을 수 없습니다.',
  SUPPLIER_NOT_FOUND: '공급자 계정이 연결되어 있지 않습니다.',
  ORG_UNAVAILABLE: 'KPA 조직 정보를 확인할 수 없습니다. 관리자에게 문의하세요.',
  INVALID_PARAMS: '필수 정보가 누락되었습니다.',
};

function extractErrorCode(err: unknown): string | null {
  const e = err as { response?: { data?: { error?: { code?: string } } } };
  return e?.response?.data?.error?.code ?? null;
}

export default function SupplierEventOfferPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<StatusTab>('active');
  const [items, setItems] = useState<OfferItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // WO-O4O-EVENT-OFFER-SUPPLIER-UI-V1: 제안 모달 상태
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposableOffers, setProposableOffers] = useState<ProposableOffer[]>([]);
  const [proposableLoading, setProposableLoading] = useState(false);
  const [proposingId, setProposingId] = useState<string | null>(null);

  // WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
  // 대상 서비스 다중 선택 상태. 모달 열릴 때 KPA Society 기본 선택.
  const [selectedTargets, setSelectedTargets] = useState<string[]>(['kpa-society']);

  const toggleTarget = useCallback((key: string) => {
    setSelectedTargets(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  }, []);

  // WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1: 내 제안 현황
  const [myProposals, setMyProposals] = useState<MyEventOfferProposal[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);

  const loadMyProposals = useCallback(async () => {
    setProposalsLoading(true);
    try {
      const data = await supplierKpaEventOfferApi.listMyProposals();
      setMyProposals(data);
    } catch {
      setMyProposals([]);
    } finally {
      setProposalsLoading(false);
    }
  }, []);

  const fetchItems = useCallback(async (p: number, status: StatusTab) => {
    setLoading(true);
    try {
      const res = await netureEventOfferApi.getEnrichedOffers({ page: p, limit: 20, status });
      const body = res.data;
      setItems(body.data ?? []);
      setTotal(body.pagination?.total ?? 0);
      setTotalPages(body.pagination?.totalPages ?? 1);
      setPage(p);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // WO-O4O-EVENT-OFFER-SUPPLIER-UI-V1: 제안 가능한 SPO 목록 로드
  const loadProposableOffers = useCallback(async () => {
    setProposableLoading(true);
    try {
      const offers = await supplierKpaEventOfferApi.listMyOffers();
      setProposableOffers(offers);
    } catch (err: unknown) {
      const code = extractErrorCode(err);
      const msg = code && PROPOSE_ERROR_MESSAGES[code]
        ? PROPOSE_ERROR_MESSAGES[code]
        : '제안 가능한 상품을 불러오지 못했습니다.';
      toast.error(msg);
      setProposableOffers([]);
    } finally {
      setProposableLoading(false);
    }
  }, []);

  const handleOpenPropose = useCallback(() => {
    setProposeOpen(true);
    // 모달 열 때마다 기본값(KPA Society)으로 초기화
    setSelectedTargets(['kpa-society']);
    loadProposableOffers();
  }, [loadProposableOffers]);

  const handleClosePropose = useCallback(() => {
    setProposeOpen(false);
    setProposableOffers([]);
    setProposingId(null);
  }, []);

  // WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
  // 단일 SPO를 선택된 대상 서비스(KPA / K-Cos)로 동시 제안.
  // 부분 실패 허용 — 서비스별 결과를 각각 toast로 표시.
  const handlePropose = useCallback(async (offerId: string, title: string) => {
    if (selectedTargets.length === 0) {
      toast.error('대상 서비스를 1개 이상 선택해 주세요.');
      return;
    }
    setProposingId(offerId);
    try {
      const result = await supplierKpaEventOfferApi.proposeEventOfferToServices(
        offerId,
        selectedTargets,
      );

      // 서비스별 결과 표시
      let createdCount = 0;
      result.results.forEach((r: PerServiceProposalResult) => {
        const label = TARGET_LABEL[r.targetServiceKey] ?? r.targetServiceKey;
        const msg = PROPOSAL_STATUS_MESSAGE[r.status] ?? r.message ?? '처리되었습니다.';
        if (r.status === 'created') {
          createdCount += 1;
          toast.success(`${label}: ${msg}`);
        } else {
          toast.error(`${label}: ${msg}`);
        }
      });

      if (createdCount > 0) {
        // 1건이라도 성공 → 모달 닫고 목록 새로고침
        handleClosePropose();
        fetchItems(page, activeTab);
        loadMyProposals();
      } else {
        // 전부 실패 → 모달 유지, 목록 재로드(이미 제안된 항목 제거)
        loadProposableOffers();
      }
      // 추가 안내: 모든 서비스에 성공한 경우
      if (createdCount === result.results.length && createdCount > 1) {
        toast.success(`"${title}" 이(가) ${createdCount}개 서비스에 제안되었습니다.`);
      }
    } catch (err: unknown) {
      const code = extractErrorCode(err);
      const msg = code && PROPOSE_ERROR_MESSAGES[code]
        ? PROPOSE_ERROR_MESSAGES[code]
        : '제안에 실패했습니다.';
      toast.error(msg);
    } finally {
      setProposingId(null);
    }
  }, [
    page, activeTab, selectedTargets,
    fetchItems, handleClosePropose, loadProposableOffers, loadMyProposals,
  ]);

  useEffect(() => {
    fetchItems(1, activeTab);
  }, [activeTab]);

  // WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1: 내 제안 현황 — 페이지 로드 시 1회 조회
  useEffect(() => {
    loadMyProposals();
  }, [loadMyProposals]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 text-slate-500 hover:text-slate-700">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Tag size={20} className="text-indigo-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">이벤트 오퍼 현황</h1>
              <p className="text-xs text-slate-500 mt-0.5">등록된 이벤트 오퍼 상태 및 조건 확인</p>
            </div>
          </div>
        </div>
        {/* WO-O4O-EVENT-OFFER-SUPPLIER-UI-V1: 이벤트 제안 진입점 */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">총 {total}건</span>
          <button
            onClick={handleOpenPropose}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <Plus size={16} />
            이벤트 제안
          </button>
        </div>
      </div>

      {/* WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1: 내 제안 현황 */}
      {(proposalsLoading || myProposals.length > 0) && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">내 제안 현황</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                내가 제안한 이벤트의 승인 상태입니다. 반려된 경우 사유를 확인하세요.
              </p>
            </div>
            <span className="text-xs text-slate-500">총 {myProposals.length}건</span>
          </div>
          {proposalsLoading && myProposals.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">불러오는 중...</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {myProposals.map((p) => {
                const badge = STATUS_LABEL[p.status] ?? { label: p.status, cls: 'bg-slate-100 text-slate-500' };
                return (
                  <li key={p.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          {/* WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1: 서비스 라벨 */}
                          <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                            {EVENT_KEY_TO_LABEL[p.serviceKey] ?? p.serviceKey}
                          </span>
                          <p className="text-sm font-medium text-slate-800 truncate">{p.title}</p>
                        </div>
                        <p className="text-xs text-slate-500">
                          {p.price != null && (
                            <span>₩{Number(p.price).toLocaleString()}</span>
                          )}
                          <span className="ml-2 text-slate-400">제안: {formatDate(p.proposedAt)}</span>
                          {p.decidedAt && (
                            <span className="ml-2 text-slate-400">결정: {formatDate(p.decidedAt)}</span>
                          )}
                        </p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium inline-block flex-shrink-0 ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    {p.status === 'rejected' && p.rejectedReason && (
                      <div className="mt-2 ml-0 px-3 py-2 bg-red-50 border-l-2 border-red-300 rounded text-xs text-red-700">
                        <span className="font-semibold">반려 사유:</span> {p.rejectedReason}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {([
          { key: 'active' as StatusTab, label: '진행중' },
          { key: 'ended' as StatusTab, label: '종료' },
          { key: 'all' as StatusTab, label: '전체' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Package size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium">등록된 이벤트 오퍼가 없습니다.</p>
          <p className="text-sm mt-1">상품 등록 후 운영자 승인을 통해 이벤트 오퍼가 생성됩니다.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>상품명 / 공급사</span>
            <span>단가</span>
            <span>기간</span>
            <span>잔여수량</span>
            <span>상태</span>
          </div>

          {/* Table Rows */}
          {items.map(item => {
            const badge = STATUS_LABEL[item.status] ?? { label: item.status, cls: 'bg-slate-100 text-slate-500' };
            return (
              <div
                key={item.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 border-b border-slate-100 last:border-0 items-center hover:bg-slate-50/60 transition-colors"
              >
                {/* 상품명 */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.productName}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{item.supplierName}</p>
                </div>

                {/* 단가 */}
                <span className="text-sm font-semibold text-slate-700">
                  {formatPrice(item.unitPrice)}
                </span>

                {/* 기간 */}
                <div className="text-xs text-slate-500">
                  {item.startAt || item.endAt ? (
                    <>
                      <div>{formatDate(item.startAt)} ~</div>
                      <div>{formatDate(item.endAt)}</div>
                    </>
                  ) : (
                    <span className="text-slate-400">무기한</span>
                  )}
                </div>

                {/* 잔여수량 */}
                <div className="text-sm">
                  {item.totalQuantity !== null ? (
                    <span className={item.totalQuantity <= 10
                      ? 'font-semibold text-amber-600'
                      : 'text-slate-700'
                    }>
                      {item.totalQuantity.toLocaleString()}개
                    </span>
                  ) : (
                    <span className="text-slate-400">무제한</span>
                  )}
                  {item.perOrderLimit !== null && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      1회 최대 {item.perOrderLimit}개
                    </div>
                  )}
                </div>

                {/* 상태 */}
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium inline-block ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => fetchItems(page - 1, activeTab)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-600">{page} / {totalPages}</span>
          <button
            onClick={() => fetchItems(page + 1, activeTab)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* WO-O4O-EVENT-OFFER-SUPPLIER-UI-V1: 이벤트 제안 모달 */}
      {proposeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={handleClosePropose}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">이벤트 제안</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  공급 중인 상품을 선택한 서비스의 이벤트로 동시에 제안합니다. 각 서비스 운영자 승인 후 노출됩니다.
                </p>
              </div>
              <button
                onClick={handleClosePropose}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1: 대상 서비스 선택 */}
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/60">
              <div className="text-xs font-semibold text-slate-700 mb-2">대상 서비스 (복수 선택)</div>
              <div className="flex flex-wrap gap-2">
                {PROPOSE_TARGETS.map(t => {
                  const checked = selectedTargets.includes(t.key);
                  return (
                    <label
                      key={t.key}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                        !t.enabled
                          ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                          : checked
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!t.enabled || proposingId !== null}
                        onChange={() => toggleTarget(t.key)}
                        className="w-3.5 h-3.5"
                      />
                      <span>{t.label}</span>
                      {t.hint && (
                        <span className="text-[10px] text-slate-400 ml-1">({t.hint})</span>
                      )}
                    </label>
                  );
                })}
              </div>
              {selectedTargets.length === 0 && (
                <p className="mt-2 text-xs text-red-600">대상 서비스를 1개 이상 선택해 주세요.</p>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {proposableLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-indigo-600" />
                </div>
              ) : proposableOffers.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Package size={36} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-medium text-sm">제안 가능한 상품이 없습니다.</p>
                  <p className="text-xs mt-1 text-slate-400">
                    승인 완료된 활성 상품 중 아직 제안하지 않은 상품만 표시됩니다.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {proposableOffers.map((offer) => (
                    <li
                      key={offer.id}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {offer.title}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {offer.supplierName}
                          {offer.price != null && (
                            <span className="ml-2 text-slate-700">
                              · ₩{Number(offer.price).toLocaleString()}
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handlePropose(offer.id, offer.title)}
                        disabled={proposingId !== null || selectedTargets.length === 0}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {proposingId === offer.id ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            제안 중...
                          </>
                        ) : (
                          '제안'
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200">
              <button
                onClick={handleClosePropose}
                disabled={proposingId !== null}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-40"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

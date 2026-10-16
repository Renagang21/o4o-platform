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

import SupplierEventNavigation from '../../components/supplier/SupplierEventNavigation';
import { useNavigate } from 'react-router-dom';
import { GuideBackLink } from '../../components/GuideBackLink';
import { Tag, ChevronLeft, ChevronRight, Package, Plus, AlertTriangle } from 'lucide-react';
import { GuideBlock } from '@o4o/shared-space-ui';
import SelectedSupplierProductBanner from '../../components/supplier/SelectedSupplierProductBanner';
import { useSupplierEventOffers } from './event-offer/useSupplierEventOffers';
import { EventProposalModal } from './event-offer/EventProposalModal';
import { STATUS_LABEL, EVENT_KEY_TO_LABEL, formatPrice, formatDate, type StatusTab } from './event-offer/presentation';

export default function SupplierEventOfferPage() {
  const navigate = useNavigate();
  const controller = useSupplierEventOffers();
  const { guideTitle, guideDesc, guideSteps, activeTab, setActiveTab, items, total, page, totalPages, loading, itemsError, myProposals, proposalsLoading, proposalsError, loadMyProposals, fetchItems, handleOpenPropose } = controller;
  return (
    <div className="max-w-5xl mx-auto p-6">
      <SupplierEventNavigation />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button type="button" aria-label="이전 화면으로 이동" onClick={() => navigate(-1)} className="p-1 text-slate-500 hover:text-slate-700">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Tag size={20} className="text-indigo-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">이벤트 오퍼 현황</h1>
              <p className="text-xs text-slate-500 mt-0.5">등록된 이벤트 오퍼 상태 및 조건 확인</p>
              <div className="mt-1"><GuideBackLink to="/guide/features/event-offer" label="Event Offer 이용 안내" /></div>
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

      {/* GuideBlock */}
      <GuideBlock
        variant="info"
        title={guideTitle ?? '이벤트 오퍼를 제안하고 현황을 확인합니다.'}
        description={guideDesc ?? '공급자 상품을 KPA Society / K-Cosmetics에 이벤트로 제안하고 승인 상태를 관리합니다.'}
        steps={guideSteps ?? [
          '"이벤트 제안" 버튼으로 제안할 상품과 대상 서비스를 선택합니다',
          '내 제안 현황에서 승인 진행 상태를 확인합니다',
          '반려된 경우 사유를 확인하고 재제안을 검토합니다',
          '승인된 오퍼는 해당 서비스 매장에 노출됩니다',
        ]}
        compact
      />

      {/* WO-O4O-NETURE-SUPPLIER-EVENT-FUNDING-WORKSPACE-PREFILL-V1: 선택 상품 context */}
      <SelectedSupplierProductBanner kind="event" />

      {/* WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1: 내 제안 현황 */}
      {(proposalsLoading || myProposals.length > 0 || proposalsError) && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">내 제안 현황</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                내가 제안한 이벤트의 승인 상태입니다. 반려된 경우 사유를 확인하세요.
              </p>
            </div>
            {!proposalsError && <span className="text-xs text-slate-500">총 {myProposals.length}건</span>}
          </div>
          {proposalsLoading && myProposals.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">불러오는 중...</div>
          ) : proposalsError ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <p className="text-sm text-slate-600">내 제안 현황을 불러오지 못했습니다.</p>
              <button
                type="button"
                onClick={loadMyProposals}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                다시 시도
              </button>
            </div>
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
      ) : itemsError ? (
        <div className="text-center py-16 text-slate-500">
          <AlertTriangle size={40} className="mx-auto mb-3 text-red-400" />
          <p className="font-medium text-slate-700">이벤트 오퍼 현황을 불러오지 못했습니다.</p>
          <p className="text-sm mt-1">일시적인 오류일 수 있습니다. 잠시 후 다시 시도해 주세요.</p>
          <button
            type="button"
            onClick={() => fetchItems(page, activeTab)}
            className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            다시 시도
          </button>
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
            type="button"
            aria-label="이전 페이지"
            onClick={() => fetchItems(page - 1, activeTab)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-600">{page} / {totalPages}</span>
          <button
            type="button"
            aria-label="다음 페이지"
            onClick={() => fetchItems(page + 1, activeTab)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <EventProposalModal controller={controller} />
    </div>
  );
}

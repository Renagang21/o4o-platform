import { AiOverviewPanel } from '@o4o/ai-components';
import { supplierCopilotApi } from '../../lib/api/supplier/copilot';
/**
 * SupplierDashboardPage — 공급자 홈 (운영 현황 중심)
 *
 * WO-O4O-NETURE-SUPPLIER-DASHBOARD-OPS-STATUS-V1
 * WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1 (2026-09-16):
 *   공급자 업무를 상품 / 주문 / 콘텐츠 3축으로 재정렬. 홈은 utility — 3축 진입점 + 처리 필요 + KPI.
 *   바로가기 · 운영 현황 블록의 어휘는 SupplierSpaceLayout 사이드바(canonical)와 동일하다.
 *
 * 구조 (위 → 아래):
 *  1. 공급자 상태 배너 (SupplierActivationGate — 승인/프로필 분리)
 *  2. 처리 필요 알림 — 실제 0 초과 항목만
 *  3. 핵심 운영 KPI — canonical 업무 화면 링크
 *  4. 업무 바로가기 — 상품 / 주문 / 콘텐츠 3축
 *  5. 상품 · 콘텐츠 운영 현황
 *  6. 상품 축 — 유통 활동 현황 (판매자 모집 / 유통참여형 펀딩 / 이벤트 오퍼)
 *  7. 공급자 계정 상태 (승인 ≠ 프로필 완성)
 *  8. 지표 분석 (Copilot 집계 블록 — 접기 가능, 하단 배치)
 *
 * WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §E (2026-09-23):
 *   당시 공급자 표면의 내부 LLM 진입점을 0 으로 만들었다. LLM 이 생성하던
 *   'AI 공급자 요약' · 'AI 상품 분석' · '추천 전략' 블록을 제거했다.
 *   남은 블록(상품 성과 · 매장 확산 · 인기/성장 상품)은 전부 SQL 집계 지표다.
 *   2026-10-24 사용자 승인으로 자기 공급자 집계의 내부 AI 현황 설명만 추가했다.
 *   문안 생성은 외부 LLM('ChatGPT로 작업')이 담당한다.
 *
 * 원칙:
 *  - 지표는 기존 API 재사용. AI 설명은 명시 요청 시 서버 집계 전용 경로를 사용한다.
 *  - 정확히 계산 가능한 수치만 표시. 추정·하드코딩 금지.
 *  - Promise.allSettled — 일부 API 실패가 전체 대시보드를 무너뜨리지 않는다.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GuideBackLink } from '../../components/GuideBackLink';
import SupplierActivationGate from '../../components/supplier/SupplierActivationGate';
import { FlaskConical, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSupplierDashboard } from './dashboard/useSupplierDashboard';
import { dashboardView } from './dashboard/dashboardView';
import { KpiLink, AreaLoadError, StatRow } from './dashboard/DashboardPrimitives';
import { SupplierMetrics } from './dashboard/SupplierMetrics';
import { won, UNAVAILABLE, OPS_AREA_LABELS, STORE_DESC_STATUS_LABELS, TRIAL_STATUS_LABELS, QUICK_LINK_GROUPS, CONTENT_LINKS } from './dashboard/presentation';

export default function SupplierDashboardPage() {
  const { user } = useAuth();
  const data = useSupplierDashboard();
  const [aiOpen, setAiOpen] = useState(false);
  const { kpi, orderKpi, inventory, settlementKpi, approval, profile, recruitments, storeDescs, trials, eventOfferStats, loading, error, opsFailed, approvalError, cdFailed, fetchData, retryRecruitments, retryStoreDescs, retryTrials, retryEventOffers } = data;
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-slate-500 text-lg mb-4">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const { recruitmentPending, profileComplete, missingProfileLabels, actionItems, waitingItems, failedAreas, cdActionAffected, showProfileAction, hasAnyAction, supplierStatusLabel, descCounts, trialCounts, recruitmentOpen } = dashboardView(data);
  const supplierLabel = profile?.name || user?.name || null;

  return (
    <div className="space-y-6">
      {/* 공급자 승인 상태 / 프로필 보완 배너 (승인 ≠ 프로필 완성) */}
      <SupplierActivationGate mode="banner">
        <></>
      </SupplierActivationGate>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">공급자 홈</h1>
          <p className="text-sm text-slate-500 mt-1">
            {supplierLabel ? `${supplierLabel}님의 ` : ''}주문·재고·정산과 상품·콘텐츠 운영 현황을 확인하세요.
          </p>
          <div className="mt-2"><GuideBackLink to="/guide/features/copilot-dashboard" label="Copilot 이용 안내" /></div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50 shrink-0"
        >
          {loading ? '로딩...' : '새로고침'}
        </button>
      </div>

      <AiOverviewPanel scopeKey={`${user?.id ?? ''}:${profile?.id ?? ''}`} disabled={loading || !profile?.id} load={async () => {
        const result = await supplierCopilotApi.explainOverview();
        if (result.supplierId !== profile?.id) throw new Error('SUPPLIER_CONTEXT_CHANGED');
        return result;
      }} />

      {/* ── 1. 처리 필요 ── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">지금 할 일</h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : hasAnyAction ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {actionItems.map((a) => (
              <Link
                key={a.key}
                to={a.to}
                className={`flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors ${
                  a.tone === 'red'
                    ? 'border-red-200 bg-red-50 hover:bg-red-100'
                    : 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <AlertTriangle size={16} className={a.tone === 'red' ? 'text-red-500 shrink-0' : 'text-amber-500 shrink-0'} />
                  <span className={`text-sm font-medium truncate ${a.tone === 'red' ? 'text-red-800' : 'text-amber-800'}`}>
                    {a.label}
                  </span>
                </span>
                <span className={`text-base font-bold shrink-0 ${a.tone === 'red' ? 'text-red-700' : 'text-amber-700'}`}>
                  {a.value.toLocaleString()}{a.unit}
                </span>
              </Link>
            ))}
            {showProfileAction && (
              <Link
                to="/mypage/business-profile"
                className="flex items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4 hover:bg-sky-100 transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <AlertTriangle size={16} className="text-sky-500 shrink-0" />
                  <span className="text-sm font-medium text-sky-800 truncate">공급자 정보 미완료</span>
                </span>
                <span className="text-xs font-semibold text-sky-700 shrink-0">등록하기</span>
              </Link>
            )}
          </div>
        ) : failedAreas.length > 0 || cdActionAffected ? (
          // 처리 필요 계산에 쓰이는 영역이 하나라도 실패하면 "처리할 업무 없음" 으로 단정하지 않는다.
          <div className="flex items-center gap-2 py-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <p className="text-sm text-slate-600">
              {[
                ...failedAreas.map((a) => OPS_AREA_LABELS[a]),
                ...(cdFailed.storeDescriptions ? ['매장용 설명서'] : []),
                ...(cdFailed.recruitments ? ['판매자 모집'] : []),
              ].join(' · ')} 현황을 불러오지 못해 처리 필요 업무를 확인할 수 없습니다.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <p className="text-sm text-slate-600">현재 직접 처리할 주요 업무가 없습니다.</p>
          </div>
        )}
        {failedAreas.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <p className="text-xs text-amber-800">
              {failedAreas.map((a) => OPS_AREA_LABELS[a]).join(' · ')} 현황을 불러오지 못했습니다. 나머지 현황은 정상입니다.
            </p>
            <button onClick={fetchData} className="text-xs font-medium text-slate-600 underline">다시 시도</button>
          </div>
        )}
      </section>

      {!loading && waitingItems.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-2 text-base font-semibold text-slate-800">기다리는 일</h2>
          <p className="mb-4 text-sm text-slate-500">검토·정산 처리를 기다리는 현황입니다. 공급자가 직접 승인하거나 지급하는 작업은 아닙니다.</p>
          <div className="flex flex-wrap gap-3">
            {waitingItems.map((item) => <Link key={item.key} to={item.to} className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">{item.label} <strong>{item.value.toLocaleString()}{item.unit}</strong></Link>)}
          </div>
        </section>
      )}

      {/* ── 2. 핵심 운영 KPI ── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">핵심 운영 현황</h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 실패 영역은 0 이 아니라 '—' 로 표시한다 (수치 오인 방지) */}
            <KpiLink label="등록 상품" value={(kpi?.registeredProducts ?? 0).toLocaleString()} to="/supplier/products" />
            <KpiLink label="판매 중" value={(kpi?.activeProducts ?? 0).toLocaleString()} to="/supplier/products" accent />
            <KpiLink
              label="처리 대기 주문"
              value={opsFailed.orders ? UNAVAILABLE : (orderKpi?.pending_processing ?? 0).toLocaleString()}
              to="/supplier/orders/manage"
              accent
            />
            <KpiLink
              label="배송 준비 주문"
              value={opsFailed.orders ? UNAVAILABLE : (orderKpi?.pending_shipping ?? 0).toLocaleString()}
              to="/supplier/orders/manage?status=preparing"
            />
            <KpiLink
              label="재고 주의"
              value={opsFailed.inventory ? UNAVAILABLE : ((inventory?.lowStock ?? 0) + (inventory?.outOfStock ?? 0)).toLocaleString()}
              to="/supplier/inventory"
            />
            <KpiLink
              label="정산 대기"
              value={opsFailed.settlements ? UNAVAILABLE : won(settlementKpi?.pending_amount ?? 0)}
              to="/supplier/settlements"
              small
            />
          </div>
        )}
      </section>

      {/* ── 3. 업무 바로가기 — 상품 / 주문 / 콘텐츠 3축 ── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">업무 바로가기</h2>
        <div className="space-y-3">
          {QUICK_LINK_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-wrap items-center gap-2">
              <span className="w-14 shrink-0 text-xs font-semibold text-slate-500">{group.label}</span>
              {group.links.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. 상품 · 콘텐츠 운영 현황 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 상품 */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">상품 · 공급</h2>
            <Link to="/supplier/products" className="text-xs font-medium text-blue-600 hover:text-blue-700">상품 목록 →</Link>
          </div>
          <dl className="space-y-2">
            <StatRow label="등록 상품" value={`${(kpi?.registeredProducts ?? 0).toLocaleString()}개`} />
            <StatRow label="판매 중" value={`${(kpi?.activeProducts ?? 0).toLocaleString()}개`} />
            {/* 승인 카운트는 별도 영역 — 실패해도 등록 상품·판매 중은 그대로 표시한다 */}
            {approvalError ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-sm text-amber-800">승인 현황을 불러오지 못했습니다.</span>
                <button
                  onClick={fetchData}
                  className="text-xs font-medium text-amber-800 underline hover:text-amber-900"
                >
                  다시 시도
                </button>
              </div>
            ) : approval ? (
              <>
                <StatRow label="승인 완료" value={`${approval.approved.toLocaleString()}개`} />
                <StatRow label="승인 대기" value={`${approval.pending.toLocaleString()}개`} />
                <StatRow label="승인 미요청" value={`${approval.unrequested.toLocaleString()}개`} />
              </>
            ) : null}
          </dl>
          <Link
            to="/supplier/products"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            상품 목록에서 유통 관리 <ArrowRight size={14} />
          </Link>
        </section>

        {/* 콘텐츠 */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">콘텐츠</h2>
            <Link to="/supplier/library" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              자료 보관함 →
            </Link>
          </div>
          {cdFailed.storeDescriptions ? (
            <AreaLoadError label="설명서 현황을 불러오지 못했습니다." onRetry={retryStoreDescs} />
          ) : storeDescs && storeDescs.length > 0 ? (
            <dl className="space-y-2">
              {Object.entries(descCounts).map(([status, count]) => (
                <StatRow
                  key={status}
                  label={`설명서 · ${STORE_DESC_STATUS_LABELS[status] ?? status}`}
                  value={`${count.toLocaleString()}건`}
                />
              ))}
            </dl>
          ) : (
            <p className="text-sm text-slate-400 py-2">작성한 매장용 상품 설명서가 없습니다.</p>
          )}
          {/* 라이브러리·태블릿·사이니지는 공통 count API 가 없어 진입점만 제공한다. */}
          <div className="mt-4 flex flex-wrap gap-2">
            {CONTENT_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ── 5. 상품 축 — 유통 활동 현황 ── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">상품 · 유통 활동</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 판매자 모집 */}
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">판매자 모집</h3>
              <Link to="/supplier/recruitments" className="text-xs text-blue-600 hover:text-blue-700">관리 →</Link>
            </div>
            {cdFailed.recruitments ? (
              <AreaLoadError label="판매자 모집 현황을 불러오지 못했습니다." onRetry={retryRecruitments} />
            ) : (
              <dl className="space-y-1.5">
                <StatRow label="전체 모집" value={`${(recruitments?.length ?? 0).toLocaleString()}건`} />
                <StatRow label="모집 중" value={`${recruitmentOpen.toLocaleString()}건`} />
                <StatRow label="신청 대기" value={`${recruitmentPending.toLocaleString()}건`} />
              </dl>
            )}
          </div>

          {/* 유통참여형 펀딩 */}
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-violet-900">
                <FlaskConical size={15} /> 유통참여형 펀딩
              </h3>
              <Link to="/supplier/market-trial" className="text-xs text-violet-700 hover:text-violet-800">관리 →</Link>
            </div>
            {cdFailed.marketTrials ? (
              <AreaLoadError label="펀딩 현황을 불러오지 못했습니다." onRetry={retryTrials} tone="violet" />
            ) : trials && trials.length > 0 ? (
              <dl className="space-y-1.5">
                {Object.entries(trialCounts).map(([status, count]) => (
                  <StatRow
                    key={status}
                    label={TRIAL_STATUS_LABELS[status] ?? status}
                    value={`${count.toLocaleString()}건`}
                  />
                ))}
              </dl>
            ) : (
              <p className="text-xs text-violet-600">
                신규 제품·유통안을 콘텐츠로 소개하고 참여 의향을 확인합니다.
              </p>
            )}
            <Link
              to="/supplier/market-trial/new"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-800"
            >
              펀딩 생성하기 <ArrowRight size={12} />
            </Link>
          </div>

          {/* 이벤트 오퍼 */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-amber-900">이벤트 오퍼 (KPA)</h3>
              <Link to="/supplier/event-offers" className="text-xs text-amber-700 hover:text-amber-800">관리 →</Link>
            </div>
            {cdFailed.eventOffers || !eventOfferStats ? (
              <AreaLoadError label="이벤트 오퍼 현황을 불러오지 못했습니다." onRetry={retryEventOffers} tone="amber" />
            ) : (
              <dl className="space-y-1.5">
                <StatRow label="전체 이벤트" value={`${eventOfferStats.totalOffers.toLocaleString()}건`} />
                <StatRow label="노출 중" value={`${eventOfferStats.activeOffers.toLocaleString()}건`} />
                <StatRow label="이벤트 주문" value={`${eventOfferStats.totalOrders.toLocaleString()}건`} />
                <StatRow label="이벤트 매출" value={won(eventOfferStats.totalRevenue)} />
              </dl>
            )}
          </div>
        </div>
      </section>

      {/* ── 6. 공급자 계정 상태 ── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">공급자 계정 상태</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">공급자 상태</p>
            <p className="text-sm font-semibold text-slate-800">
              {supplierStatusLabel ?? '확인할 수 없음'}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">프로필 정보</p>
            <p className="text-sm font-semibold text-slate-800">
              {profile == null ? '확인할 수 없음' : profileComplete ? '입력 완료' : '일부 미입력'}
            </p>
            {!profileComplete && missingProfileLabels.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">미입력: {missingProfileLabels.join(', ')}</p>
            )}
            {profile != null && !profileComplete && (
              <Link
                to="/mypage/business-profile"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                공급자 정보 등록 <ArrowRight size={12} />
              </Link>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          공급자 승인과 프로필 완성은 별개입니다. 프로필이 일부 미입력이어도 승인된 공급 업무는 그대로 이용할 수 있습니다.
        </p>
      </section>

      <SupplierMetrics data={data} open={aiOpen} onToggle={() => setAiOpen(!aiOpen)} />
    </div>
  );
}

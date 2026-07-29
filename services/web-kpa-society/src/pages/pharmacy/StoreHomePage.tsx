/**
 * StoreHomePage — 내 약국 홈 (종합 운영 홈)
 *
 * WO-KPA-A-STORE-HOME-AND-SIDEBAR-RESTRUCTURE-V1
 * WO-KPA-A-STORE-HOME-KPI-AND-CONTENT-BALANCE-REFINE-V1:
 *   - KPI 4칸: QR-only → 운영 혼합형 (매장 자산 관리, 활성 QR, 진열 상품, 이번주 스캔)
 *   - 하단 콘텐츠 균형 조정 (마케팅 성과 → 홍보 성과 요약, 비중 축소)
 *   - 문구/섹션 제목 종합 홈 성격으로 보정
 *
 * WO-O4O-STORE-UX-STRUCTURE-ALIGNMENT-V1:
 *   - "주요 바로가기" → "실행 흐름" 3-step 구조로 재편
 *
 * WO-O4O-STORE-DASHBOARD-DESIGN-REFINEMENT-V1:
 *   - inline style → Tailwind, hex → theme, Card 적용
 *
 * WO-O4O-KPA-STORE-HOME-EXECUTION-FLOW-ALIGN-V1:
 *   - Step 2 "콘텐츠 만들기" → "제작 자료 만들기" (단일 진입으로 IA 정합)
 *   - POP/QR/블로그/상품 상세설명 직접 링크 제거 →
 *     "매장 제작 자료"(/store/library/production-materials) 단일 링크로 교체
 *   - 각 step 에 1줄 안내 추가 (제작 vs 배포·운영 의미 명료화)
 *   - Step 3 사이니지·채널 관리 링크는 변경 없음 (배포/운영 성격 유지)
 *
 * WO-O4O-KPA-STORE-HOME-CTA-AND-MENU-ALIGNMENT-V1:
 *   - 홈 CTA 명칭·route 를 현재 사이드바(storeMenuConfig KPA)·canonical 진입점에 정합.
 *   - Step 1: "상품 관리" → "O4O 제품"(라벨 정합) + "매장 경영활용 제품"(/store/handled-products) 분리(§6.3).
 *   - Step 3: "사이니지" legacy redirect 경유 제거(/marketing/signage → 직접 /marketing/signage/playlist),
 *     "채널 관리"(/store/channels redirect) → "판매 설정"(직접 /store/online-sales/settings),
 *     "태블렛 화면 제작"(/store/commerce/tablet-displays) 추가 — §6.5 태블렛·온라인 판매 채널 활용.
 *   - 재설계·KPI·API·데이터·store-ui-core 변경 없음.
 *
 * WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-ENTRY-ALIGNMENT-V1 (위 변경 이력 주석의 계약 정정):
 *   HOME-EXECUTION-FLOW-ALIGN-V1 항목의 "매장 제작 자료(/store/library/production-materials) 단일 링크"는
 *   이후 CTA-AND-MENU-ALIGNMENT-V1 에서 이미 교체되어 현재 홈에는 해당 CTA 가 없다(활성 링크 0).
 *   해당 route 는 현재 /store/library/contents 로 replace redirect 되는 legacy URL 이며,
 *   제작 결과 확인의 canonical 진입은 Step 2 "콘텐츠 자료함"(/store/library/contents) 이다.
 *   홈 CTA 재추가 금지.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  QrCode,
  BookOpen,
  Monitor,
  Package,
  BarChart3,
  RefreshCw,
  ArrowRight,
  Clock,
  Smartphone,
  Tablet as TabletIcon,
  AlertCircle,
  FileEdit,
  Store,
  Settings,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@o4o/ui';
// WO-O4O-STORE-HOME-KPA-ADOPT-V1:
// canonical StoreHomeShell 3번째 소비처. "실행 흐름 3단계"(기능 안내/온보딩 성격)를
// onboardingSlot 으로 이동·하단 강등. 운영 블록(Live Signals/KPI/홍보성과/최근활동)은
// 위치·의미 유지. KPA 전용 fetch/adapter 는 service-local 유지 — 셸은 API 를 알지 않음.
import { StoreHomeShell } from '@o4o/store-ui-core';
import { kpaConfig } from '@o4o/operator-ux-core';
import { getMarketingAnalytics, getRecentScans } from '../../api/storeAnalytics';
import type { MarketingAnalyticsData, RecentScanItem } from '../../api/storeAnalytics';
import { getStoreExecutionAssets } from '../../api/storeExecutionAssets';
import { getListings } from '../../api/pharmacyProducts';
import { getStoreSlug } from '../../api/pharmacyInfo';
import { fetchLiveSignals } from '../../api/storeHub';
import type { LiveSignals } from '../../api/storeHub';
import { GuideEditableSection } from '../../components/guide';

export function StoreHomePage() {
  const [analytics, setAnalytics] = useState<MarketingAnalyticsData | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const [libraryCount, setLibraryCount] = useState<number | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [liveSignals, setLiveSignals] = useState<LiveSignals | null>(null);
  const [loading, setLoading] = useState(true);
  const [noStore, setNoStore] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // WO-KPA-PHARMACY-OWNER-WITHOUT-STORE-HANDLING-V1: 매장 미연결 시 inline 안내
      // (navigate('/pharmacy') 사용 금지 — PharmacyPage의 hasStoreRole→/store redirect와 무한루프 발생)
      const storeSlug = await getStoreSlug();
      if (!storeSlug) { setNoStore(true); setLoading(false); return; }

      const [analyticsRes, scansRes, libraryRes, listingsRes, signalsRes] = await Promise.all([
        getMarketingAnalytics().catch(() => null),
        getRecentScans().catch(() => null),
        getStoreExecutionAssets({ page: 1, limit: 1 }).catch(() => null),
        getListings().catch(() => null),
        fetchLiveSignals().catch(() => null),
      ]);
      if (analyticsRes?.success && analyticsRes.data) {
        setAnalytics(analyticsRes.data);
      }
      if (scansRes?.success && scansRes.data) {
        setRecentScans(scansRes.data);
      }
      if (libraryRes?.success && libraryRes.data) {
        setLibraryCount(libraryRes.data.total);
      }
      if (listingsRes?.success && listingsRes.data) {
        setProductCount(listingsRes.data.filter((p) => p.is_active).length);
      }
      if (signalsRes) {
        setLiveSignals(signalsRes);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (noStore) {
    return (
      <div className="max-w-[960px]">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle size={32} className="text-slate-400" />
          <p className="text-base font-medium text-slate-700">약국 매장이 아직 연결되지 않았습니다</p>
          <p className="text-sm text-slate-500">약국 경영지원 서비스 신청 후 매장이 활성화됩니다.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-[960px]">
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw size={24} className="text-slate-300" />
          <p className="text-sm text-slate-500 mt-3">불러오는 중...</p>
        </div>
      </div>
    );
  }

  const deviceIcon: Record<string, React.ReactNode> = {
    mobile: <Smartphone size={13} className="text-primary" />,
    tablet: <TabletIcon size={13} className="text-violet-600" />,
    desktop: <Monitor size={13} className="text-emerald-600" />,
  };
  const deviceLabel: Record<string, string> = { mobile: '모바일', tablet: '태블릿', desktop: '데스크톱' };

  return (
    <div className="max-w-[960px]">
      {/* Header (WO-O4O-KPA-STORE-RESPONSIVE-AND-HAMBURGER-MENU-SIMPLIFY-V1:
          좁은 화면에서 제목·버튼이 한 행을 유지하되 매우 좁으면 자연 줄바꿈, 버튼 padding 축소, aria-label 추가) */}
      <div className="flex flex-wrap justify-between items-start gap-2 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 m-0">{kpaConfig.uiText.storeHomeTitle}</h1>
          <p className="text-xs sm:text-[13px] text-slate-500 mt-1">{kpaConfig.uiText.storeHomeSubtitle}</p>
        </div>
        <button onClick={fetchData} aria-label="새로고침" className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 border border-slate-200 rounded-lg bg-white text-[13px] text-slate-600 cursor-pointer whitespace-nowrap shrink-0">
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* ── Live Signals — 미처리 운영 신호 (WO-O4O-KPA-STORE-HOME-LIVE-SIGNALS-V1) ── */}
      {liveSignals && (liveSignals.newOrders > 0 || liveSignals.pendingTabletRequests > 0 || liveSignals.pendingSalesRequests > 0) && (
        <div className="mb-4 flex flex-col gap-2">
          {liveSignals.newOrders > 0 && (
            <Link to="/store/commerce/orders" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] font-medium text-amber-800 no-underline hover:bg-amber-100">
              <AlertCircle size={15} className="flex-shrink-0 text-amber-500" />
              신규 주문 {liveSignals.newOrders}건 대기
              <ArrowRight size={13} className="ml-auto" />
            </Link>
          )}
          {liveSignals.pendingTabletRequests > 0 && (
            <Link to="/store/requests" className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-[13px] font-medium text-blue-800 no-underline hover:bg-blue-100">
              <AlertCircle size={15} className="flex-shrink-0 text-blue-500" />
              상담 요청 {liveSignals.pendingTabletRequests}건 대기
              <ArrowRight size={13} className="ml-auto" />
            </Link>
          )}
          {liveSignals.pendingSalesRequests > 0 && (
            <Link to="/store/commerce/products" className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-[13px] font-medium text-violet-800 no-underline hover:bg-violet-100">
              <AlertCircle size={15} className="flex-shrink-0 text-violet-500" />
              판매 요청 {liveSignals.pendingSalesRequests}건 대기
              <ArrowRight size={13} className="ml-auto" />
            </Link>
          )}
        </div>
      )}

      {/* ── 운영 현황 KPI (WO-O4O-KPA-STORE-RESPONSIVE-AND-HAMBURGER-MENU-SIMPLIFY-V1) ──
          좁은 화면에서도 2열×2행으로 조밀하게(360px 이상 기본 2열), 데스크톱은 기존 4열 유지.
          template grid(kpa=grid-cols-1 sm:grid-cols-2 …)는 모바일 1열 원인이므로 service-local 명시 grid로 대체.
          카드 padding/숫자 크기는 좁은 화면에서 compact 처리(데스크톱 값 유지). */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-5 sm:mb-6">
        {/* WO-O4O-KPA-STORE-HOME-KPI-LABEL-FIX-V1: 레이블 "매장 자산 관리" → "자료실 파일", 클릭 링크 추가 */}
        <Link to="/store/library/contents" className="no-underline">
          <Card className="p-3 sm:p-5 text-center h-full hover:border-emerald-300 transition-colors cursor-pointer">
            <BookOpen size={20} className="text-emerald-600 mx-auto" />
            <p className="text-xl sm:text-2xl font-bold text-primary m-0 mt-1.5 sm:mt-2">{libraryCount ?? '–'}</p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 m-0">자료실 파일</p>
          </Card>
        </Link>
        <Card className="p-3 sm:p-5 text-center h-full">
          <QrCode size={20} className="text-primary mx-auto" />
          <p className="text-xl sm:text-2xl font-bold text-primary m-0 mt-1.5 sm:mt-2">{analytics?.activeQrCount ?? '–'}</p>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 m-0">활성 QR</p>
        </Card>
        <Card className="p-3 sm:p-5 text-center h-full">
          <Package size={20} className="text-violet-600 mx-auto" />
          <p className="text-xl sm:text-2xl font-bold text-primary m-0 mt-1.5 sm:mt-2">{productCount ?? '–'}</p>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 m-0">진열 상품</p>
        </Card>
        <Card className="p-3 sm:p-5 text-center h-full">
          <BarChart3 size={20} className="text-primary mx-auto" />
          <p className="text-xl sm:text-2xl font-bold text-primary m-0 mt-1.5 sm:mt-2">{analytics?.weeklyScans?.toLocaleString() ?? '–'}</p>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 m-0">이번주 스캔</p>
        </Card>
      </div>

      {/* ── 하단 2열: 홍보 성과 요약 + 최근 활동 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* 홍보 성과 요약 */}
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[15px] font-semibold text-slate-800 m-0">홍보 성과 요약</h2>
            <Link to="/store/analytics/marketing" className="flex items-center gap-1 text-xs text-primary no-underline">
              상세 분석 <ArrowRight size={12} />
            </Link>
          </div>
          {!analytics || analytics.topQrCodes.length === 0 ? (
            <p className="text-[13px] text-slate-400 text-center py-5 m-0">
              <GuideEditableSection
                pageKey="store"
                sectionKey="empty-marketing"
                defaultContent="아직 홍보 성과 데이터가 없습니다"
              />
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {analytics.topQrCodes.slice(0, 3).map((qr, idx) => (
                <div key={qr.id} className="flex items-center gap-3 px-2.5 py-2 rounded-lg bg-slate-50">
                  <span className="w-[22px] h-[22px] flex items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600 flex-shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-800 m-0 overflow-hidden text-ellipsis whitespace-nowrap">{qr.title}</p>
                    <span className="text-[11px] text-slate-400">{qr.scanCount}회 스캔</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 최근 활동 */}
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[15px] font-semibold text-slate-800 m-0">최근 활동</h2>
          </div>
          {recentScans.length === 0 ? (
            <p className="text-[13px] text-slate-400 text-center py-5 m-0">
              <GuideEditableSection
                pageKey="store"
                sectionKey="empty-activity"
                defaultContent="최근 활동 기록이 없습니다"
              />
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {recentScans.slice(0, 6).map((scan, idx) => (
                <div key={idx} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-slate-50">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 flex-shrink-0">
                    {deviceIcon[scan.deviceType] || <Smartphone size={13} className="text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-800 m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                      {scan.qrTitle || '(삭제된 QR)'}
                    </p>
                    <span className="inline-flex items-center text-[11px] text-slate-400 mt-0.5">
                      <Clock size={10} className="mr-0.5" />
                      {formatRelativeTime(scan.createdAt)}
                      {' · '}
                      {deviceLabel[scan.deviceType] || scan.deviceType}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── 실행 흐름 → StoreHomeShell.onboardingSlot 으로 이동·하단 강등 ── */}
      {/* WO-O4O-STORE-HOME-KPA-ADOPT-V1: 기능 안내/온보딩 성격이므로 운영 블록 */}
      {/* (Live Signals / KPI / 홍보성과 / 최근활동) 아래로 내림. 내용 삭제 아님. */}
      <StoreHomeShell
        onboardingSlot={
          <Card className="p-5 mb-4">
            <h2 className="text-[15px] font-semibold text-slate-800 m-0 mb-3">실행 흐름</h2>
            <div className="flex flex-col">

              {/* Step 1: 상품 선택 (WO-O4O-KPA-STORE-HOME-CTA-AND-MENU-ALIGNMENT-V1 §6.3:
                  O4O 제품(공급·주문 카탈로그) / 매장 경영활용 제품(설명·QR 활용) 진입 분리) */}
              <div className="py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-primary text-[11px] font-bold text-white flex-shrink-0">1</span>
                  <span className="text-[13px] font-semibold text-primary tracking-wide">상품 선택</span>
                </div>
                <p className="text-[12px] text-slate-500 m-0 mb-2.5 pl-[30px]">판매할 O4O 제품을 찾거나, 매장에서 경영에 활용할 제품을 등록·관리합니다.</p>
                <div className="flex flex-wrap gap-2 pl-[30px]">
                  <Link to="/store/commerce/products" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 no-underline text-[13px] font-medium text-slate-700 transition-colors hover:border-primary">
                    <Package size={16} className="text-violet-600" />
                    <span>O4O 제품</span>
                  </Link>
                  <Link to="/store/handled-products" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 no-underline text-[13px] font-medium text-slate-700 transition-colors hover:border-primary">
                    <Store size={16} className="text-emerald-600" />
                    <span>매장 경영활용 제품</span>
                  </Link>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Step 2: 콘텐츠에서 만들기 (WO-O4O-KPA-QR-POP-RESULT-SCOPE-V1)
                  제작 자료 메뉴를 사용자에게 노출하지 않으므로, 콘텐츠 자료함(콘텐츠 선택 → QR·POP 바로 만들기)으로 안내. */}
              <div className="py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-emerald-600 text-[11px] font-bold text-white flex-shrink-0">2</span>
                  <span className="text-[13px] font-semibold text-emerald-600 tracking-wide">콘텐츠에서 만들기</span>
                </div>
                <p className="text-[12px] text-slate-500 m-0 mb-2.5 pl-[30px]">콘텐츠를 선택해 QR-code · POP을 바로 만듭니다.</p>
                <div className="flex flex-wrap gap-2 pl-[30px]">
                  <Link to="/store/library/contents" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 no-underline text-[13px] font-medium text-slate-700 transition-colors hover:border-primary">
                    <FileEdit size={16} className="text-emerald-600" />
                    <span>콘텐츠 자료함</span>
                  </Link>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Step 3: 매장에 적용하기 (배포·운영) */}
              <div className="py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-violet-600 text-[11px] font-bold text-white flex-shrink-0">3</span>
                  <span className="text-[13px] font-semibold text-violet-600 tracking-wide">매장에 적용하기</span>
                </div>
                <p className="text-[12px] text-slate-500 m-0 mb-2.5 pl-[30px]">제작한 자료를 사이니지·태블렛·온라인 판매 등 매장 채널에 배포·운영합니다.</p>
                <div className="flex flex-wrap gap-2 pl-[30px]">
                  {/* WO-O4O-KPA-STORE-HOME-CTA-AND-MENU-ALIGNMENT-V1 §6.2: legacy redirect 경유 제거 —
                      최종 canonical route(/marketing/signage/playlist, /online-sales/settings)로 직접 이동. */}
                  <Link to="/store/marketing/signage/playlist" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 no-underline text-[13px] font-medium text-slate-700 transition-colors hover:border-primary">
                    <Monitor size={16} className="text-primary" />
                    <span>사이니지</span>
                  </Link>
                  <Link to="/store/commerce/tablet-displays" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 no-underline text-[13px] font-medium text-slate-700 transition-colors hover:border-primary">
                    <TabletIcon size={16} className="text-violet-600" />
                    <span>태블렛 화면 제작</span>
                  </Link>
                  <Link to="/store/online-sales/settings" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 no-underline text-[13px] font-medium text-slate-700 transition-colors hover:border-primary">
                    <Settings size={16} className="text-emerald-600" />
                    <span>판매 설정</span>
                  </Link>
                </div>
              </div>

            </div>
          </Card>
        }
      />
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

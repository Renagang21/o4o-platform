/**
 * StoreHomePage — 내 약국 홈 (종합 운영 홈)
 *
 * WO-KPA-A-STORE-HOME-AND-SIDEBAR-RESTRUCTURE-V1
 * WO-KPA-A-STORE-HOME-KPI-AND-CONTENT-BALANCE-REFINE-V1:
 *   - KPI 4칸: QR-only → 운영 혼합형 (자료실, 활성 QR, 진열 상품, 이번주 스캔)
 *   - 하단 콘텐츠 균형 조정 (마케팅 성과 → 홍보 성과 요약, 비중 축소)
 *   - 문구/섹션 제목 종합 홈 성격으로 보정
 *
 * WO-O4O-STORE-UX-STRUCTURE-ALIGNMENT-V1:
 *   - "주요 바로가기" → "실행 흐름" 3-step 구조로 재편
 *
 * WO-O4O-STORE-DASHBOARD-DESIGN-REFINEMENT-V1:
 *   - inline style → Tailwind, hex → theme, Card 적용
 */

import { useState, useEffect, useCallback } from 'react';
import {
  QrCode,
  Megaphone,
  BookOpen,
  Monitor,
  Newspaper,
  Package,
  BarChart3,
  RefreshCw,
  ArrowRight,
  Clock,
  Smartphone,
  Tablet as TabletIcon,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@o4o/ui';
import { kpaConfig } from '@o4o/operator-ux-core';
import { getMarketingAnalytics, getRecentScans } from '../../api/storeAnalytics';
import type { MarketingAnalyticsData, RecentScanItem } from '../../api/storeAnalytics';
import { getStoreLibraryItems } from '../../api/storeExecutionAssets';
import { getListings } from '../../api/pharmacyProducts';
import { getStoreSlug } from '../../api/pharmacyInfo';
import { GuideEditableSection } from '../../components/guide';

export function StoreHomePage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<MarketingAnalyticsData | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const [libraryCount, setLibraryCount] = useState<number | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // WO-KPA-PHARMACY-OWNER-WITHOUT-STORE-HANDLING-V1: 매장 미연결 → 게이트로
      const storeSlug = await getStoreSlug();
      if (!storeSlug) { navigate('/pharmacy', { replace: true }); return; }

      const [analyticsRes, scansRes, libraryRes, listingsRes] = await Promise.all([
        getMarketingAnalytics().catch(() => null),
        getRecentScans().catch(() => null),
        getStoreLibraryItems({ page: 1, limit: 1 }).catch(() => null),
        getListings().catch(() => null),
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
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-[960px] p-6">
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
    <div className="max-w-[960px] p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 m-0">{kpaConfig.uiText.storeHomeTitle}</h1>
          <p className="text-[13px] text-slate-500 mt-1">{kpaConfig.uiText.storeHomeSubtitle}</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-lg bg-white text-[13px] text-slate-600 cursor-pointer whitespace-nowrap">
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* ── 운영 현황 KPI ── */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-5 text-center">
          <BookOpen size={20} className="text-emerald-600 mx-auto" />
          <p className="text-2xl font-bold text-primary m-0 mt-2">{libraryCount ?? '–'}</p>
          <p className="text-xs text-slate-500 mt-1 m-0">자료실</p>
        </Card>
        <Card className="p-5 text-center">
          <QrCode size={20} className="text-primary mx-auto" />
          <p className="text-2xl font-bold text-primary m-0 mt-2">{analytics?.activeQrCount ?? '–'}</p>
          <p className="text-xs text-slate-500 mt-1 m-0">활성 QR</p>
        </Card>
        <Card className="p-5 text-center">
          <Package size={20} className="text-violet-600 mx-auto" />
          <p className="text-2xl font-bold text-primary m-0 mt-2">{productCount ?? '–'}</p>
          <p className="text-xs text-slate-500 mt-1 m-0">진열 상품</p>
        </Card>
        <Card className="p-5 text-center">
          <BarChart3 size={20} className="text-primary mx-auto" />
          <p className="text-2xl font-bold text-primary m-0 mt-2">{analytics?.weeklyScans?.toLocaleString() ?? '–'}</p>
          <p className="text-xs text-slate-500 mt-1 m-0">이번주 스캔</p>
        </Card>
      </div>

      {/* ── 실행 흐름 (WO-O4O-STORE-UX-STRUCTURE-ALIGNMENT-V1) ── */}
      <Card className="p-5 mb-4">
        <h2 className="text-[15px] font-semibold text-slate-800 m-0 mb-3">실행 흐름</h2>
        <div className="flex flex-col">

          {/* Step 1: 상품 선택 */}
          <div className="py-3">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-primary text-[11px] font-bold text-white flex-shrink-0">1</span>
              <span className="text-[13px] font-semibold text-primary tracking-wide">상품 선택</span>
            </div>
            <div className="flex flex-wrap gap-2 pl-[30px]">
              <Link to="/store/commerce/products" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 no-underline text-[13px] font-medium text-slate-700 transition-colors hover:border-primary">
                <Package size={16} className="text-violet-600" />
                <span>상품 관리</span>
              </Link>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Step 2: 콘텐츠 만들기 */}
          <div className="py-3">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-emerald-600 text-[11px] font-bold text-white flex-shrink-0">2</span>
              <span className="text-[13px] font-semibold text-emerald-600 tracking-wide">콘텐츠 만들기</span>
            </div>
            <div className="flex flex-wrap gap-2 pl-[30px]">
              <Link to="/store/content" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 no-underline text-[13px] font-medium text-slate-700 transition-colors hover:border-primary">
                <BookOpen size={16} className="text-emerald-600" />
                <span>자료실</span>
              </Link>
              <Link to="/store/marketing/qr" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 no-underline text-[13px] font-medium text-slate-700 transition-colors hover:border-primary">
                <QrCode size={16} className="text-primary" />
                <span>QR 관리</span>
              </Link>
              <Link to="/store/marketing/pop" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 no-underline text-[13px] font-medium text-slate-700 transition-colors hover:border-primary">
                <Megaphone size={16} className="text-amber-500" />
                <span>POP 자료</span>
              </Link>
              <Link to="/store/content/blog" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 no-underline text-[13px] font-medium text-slate-700 transition-colors hover:border-primary">
                <Newspaper size={16} className="text-pink-500" />
                <span>블로그</span>
              </Link>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Step 3: 매장에 적용하기 */}
          <div className="py-3">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-violet-600 text-[11px] font-bold text-white flex-shrink-0">3</span>
              <span className="text-[13px] font-semibold text-violet-600 tracking-wide">매장에 적용하기</span>
            </div>
            <div className="flex flex-wrap gap-2 pl-[30px]">
              <Link to="/store/marketing/signage" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 no-underline text-[13px] font-medium text-slate-700 transition-colors hover:border-primary">
                <Monitor size={16} className="text-primary" />
                <span>사이니지</span>
              </Link>
              <Link to="/store/channels" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 no-underline text-[13px] font-medium text-slate-700 transition-colors hover:border-primary">
                <BarChart3 size={16} className="text-violet-600" />
                <span>채널 관리</span>
              </Link>
            </div>
          </div>

        </div>
      </Card>

      {/* ── 하단 2열: 홍보 성과 요약 + 최근 활동 ── */}
      <div className="grid grid-cols-2 gap-4 mb-4">
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

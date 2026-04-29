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
import { colors } from '../../styles/theme';
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
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <RefreshCw size={24} style={{ color: colors.neutral300 }} />
          <p style={{ color: colors.neutral500, fontSize: '14px', marginTop: '12px' }}>불러오는 중...</p>
        </div>
      </div>
    );
  }

  const deviceIcon: Record<string, React.ReactNode> = {
    mobile: <Smartphone size={13} style={{ color: '#2563eb' }} />,
    tablet: <TabletIcon size={13} style={{ color: '#7c3aed' }} />,
    desktop: <Monitor size={13} style={{ color: '#059669' }} />,
  };
  const deviceLabel: Record<string, string> = { mobile: '모바일', tablet: '태블릿', desktop: '데스크톱' };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{kpaConfig.uiText.storeHomeTitle}</h1>
          <p style={styles.subtitle}>{kpaConfig.uiText.storeHomeSubtitle}</p>
        </div>
        <button onClick={fetchData} style={styles.refreshBtn}>
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* ── 운영 현황 KPI ── */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <BookOpen size={20} style={{ color: '#059669', marginBottom: '8px' }} />
          <p style={styles.kpiValue}>{libraryCount ?? '–'}</p>
          <p style={styles.kpiLabel}>자료실</p>
        </div>
        <div style={styles.kpiCard}>
          <QrCode size={20} style={{ color: colors.primary, marginBottom: '8px' }} />
          <p style={styles.kpiValue}>{analytics?.activeQrCount ?? '–'}</p>
          <p style={styles.kpiLabel}>활성 QR</p>
        </div>
        <div style={styles.kpiCard}>
          <Package size={20} style={{ color: '#7c3aed', marginBottom: '8px' }} />
          <p style={styles.kpiValue}>{productCount ?? '–'}</p>
          <p style={styles.kpiLabel}>진열 상품</p>
        </div>
        <div style={styles.kpiCard}>
          <BarChart3 size={20} style={{ color: '#2563eb', marginBottom: '8px' }} />
          <p style={styles.kpiValue}>{analytics?.weeklyScans?.toLocaleString() ?? '–'}</p>
          <p style={styles.kpiLabel}>이번주 스캔</p>
        </div>
      </div>

      {/* ── 실행 흐름 (WO-O4O-STORE-UX-STRUCTURE-ALIGNMENT-V1) ── */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>실행 흐름</h2>
        <div style={styles.stepFlow}>

          {/* Step 1: 상품 선택 */}
          <div style={styles.stepGroup}>
            <div style={styles.stepHeader}>
              <span style={{ ...styles.stepBadge, backgroundColor: '#2563eb' }}>1</span>
              <span style={{ ...styles.stepLabel, color: '#2563eb' }}>상품 선택</span>
            </div>
            <div style={styles.stepLinks}>
              <Link to="/store/commerce/products" style={styles.stepLink}>
                <Package size={16} style={{ color: '#7c3aed' }} />
                <span>상품 관리</span>
              </Link>
            </div>
          </div>

          <div style={styles.stepDivider} />

          {/* Step 2: 콘텐츠 만들기 */}
          <div style={styles.stepGroup}>
            <div style={styles.stepHeader}>
              <span style={{ ...styles.stepBadge, backgroundColor: '#059669' }}>2</span>
              <span style={{ ...styles.stepLabel, color: '#059669' }}>콘텐츠 만들기</span>
            </div>
            <div style={styles.stepLinks}>
              <Link to="/store/content" style={styles.stepLink}>
                <BookOpen size={16} style={{ color: '#059669' }} />
                <span>자료실</span>
              </Link>
              <Link to="/store/marketing/qr" style={styles.stepLink}>
                <QrCode size={16} style={{ color: colors.primary }} />
                <span>QR 관리</span>
              </Link>
              <Link to="/store/marketing/pop" style={styles.stepLink}>
                <Megaphone size={16} style={{ color: '#f59e0b' }} />
                <span>POP 자료</span>
              </Link>
              <Link to="/store/content/blog" style={styles.stepLink}>
                <Newspaper size={16} style={{ color: '#ec4899' }} />
                <span>블로그</span>
              </Link>
            </div>
          </div>

          <div style={styles.stepDivider} />

          {/* Step 3: 매장에 적용하기 */}
          <div style={styles.stepGroup}>
            <div style={styles.stepHeader}>
              <span style={{ ...styles.stepBadge, backgroundColor: '#7c3aed' }}>3</span>
              <span style={{ ...styles.stepLabel, color: '#7c3aed' }}>매장에 적용하기</span>
            </div>
            <div style={styles.stepLinks}>
              <Link to="/store/marketing/signage" style={styles.stepLink}>
                <Monitor size={16} style={{ color: '#2563eb' }} />
                <span>사이니지</span>
              </Link>
              <Link to="/store/channels" style={styles.stepLink}>
                <BarChart3 size={16} style={{ color: '#7c3aed' }} />
                <span>채널 관리</span>
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* ── 하단 2열: 홍보 성과 요약 + 최근 활동 ── */}
      <div style={styles.twoCol}>
        {/* 홍보 성과 요약 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>홍보 성과 요약</h2>
            <Link to="/store/analytics/marketing" style={styles.seeAllLink}>
              상세 분석 <ArrowRight size={12} />
            </Link>
          </div>
          {!analytics || analytics.topQrCodes.length === 0 ? (
            <p style={styles.emptyText}>
              <GuideEditableSection
                pageKey="store"
                sectionKey="empty-marketing"
                defaultContent="아직 홍보 성과 데이터가 없습니다"
              />
            </p>
          ) : (
            <div style={styles.topList}>
              {analytics.topQrCodes.slice(0, 3).map((qr, idx) => (
                <div key={qr.id} style={styles.topItem}>
                  <span style={styles.topRank}>{idx + 1}</span>
                  <div style={styles.topInfo}>
                    <p style={styles.topTitle}>{qr.title}</p>
                    <span style={styles.topSlug}>{qr.scanCount}회 스캔</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 최근 활동 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>최근 활동</h2>
          </div>
          {recentScans.length === 0 ? (
            <p style={styles.emptyText}>
              <GuideEditableSection
                pageKey="store"
                sectionKey="empty-activity"
                defaultContent="최근 활동 기록이 없습니다"
              />
            </p>
          ) : (
            <div style={styles.recentList}>
              {recentScans.slice(0, 6).map((scan, idx) => (
                <div key={idx} style={styles.recentItem}>
                  <div style={styles.recentIcon}>
                    {deviceIcon[scan.deviceType] || <Smartphone size={13} style={{ color: colors.neutral400 }} />}
                  </div>
                  <div style={styles.recentInfo}>
                    <p style={styles.recentTitle}>
                      {scan.qrTitle || '(삭제된 QR)'}
                    </p>
                    <span style={styles.recentMeta}>
                      <Clock size={10} style={{ marginRight: '3px' }} />
                      {formatRelativeTime(scan.createdAt)}
                      {' · '}
                      {deviceLabel[scan.deviceType] || scan.deviceType}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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

// ── 스타일 ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '960px',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: colors.neutral500,
    marginTop: '4px',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    backgroundColor: '#fff',
    fontSize: '13px',
    color: colors.neutral600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  // KPI
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  },
  kpiCard: {
    padding: '20px 16px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  kpiValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: 0,
  },
  kpiLabel: {
    fontSize: '12px',
    color: colors.neutral500,
    margin: '4px 0 0',
  },

  // Two column
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px',
  },

  // Section
  section: {
    padding: '20px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    backgroundColor: '#fff',
    marginBottom: '16px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  seeAllLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: colors.primary,
    textDecoration: 'none',
  },
  emptyText: {
    fontSize: '13px',
    color: colors.neutral400,
    textAlign: 'center',
    padding: '20px 0',
    margin: 0,
  },

  // Top QR
  topList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  topItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 10px',
    borderRadius: '8px',
    backgroundColor: colors.neutral50,
  },
  topRank: {
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    backgroundColor: colors.neutral200,
    fontSize: '11px',
    fontWeight: 700,
    color: colors.neutral600,
    flexShrink: 0,
  },
  topInfo: {
    flex: 1,
    minWidth: 0,
  },
  topTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral800,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  topSlug: {
    fontSize: '11px',
    color: colors.neutral400,
  },

  // Recent Activity
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  recentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '8px',
    backgroundColor: colors.neutral50,
  },
  recentIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral200}`,
    flexShrink: 0,
  },
  recentInfo: {
    flex: 1,
    minWidth: 0,
  },
  recentTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral800,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  recentMeta: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '11px',
    color: colors.neutral400,
    marginTop: '2px',
  },

  // 실행 흐름 — 3-step structure
  stepFlow: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0',
  },
  stepGroup: {
    paddingTop: '12px',
    paddingBottom: '12px',
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  stepBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    fontSize: '11px',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  stepLabel: {
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  stepLinks: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    paddingLeft: '30px',
  },
  stepLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    backgroundColor: colors.neutral50,
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral700,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  stepDivider: {
    height: '1px',
    backgroundColor: colors.neutral100,
    margin: '0',
  },
};

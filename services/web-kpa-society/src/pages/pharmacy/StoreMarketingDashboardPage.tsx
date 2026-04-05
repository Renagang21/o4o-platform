/**
 * StoreMarketingDashboardPage — 매장 마케팅 대시보드
 *
 * WO-O4O-STORE-MARKETING-DASHBOARD-V1
 * WO-KPA-A-STORE-PHASE1-UI-UX-REFINE-V1: QR 편향 완화 (Quick Actions 확장, 제목 개선)
 *
 * Store Hub 마케팅 진입 화면.
 * KPI 요약 + 마케팅 성과 + 최근 활동 + 빠른 이동.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  QrCode,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  ArrowRight,
  Megaphone,
  BookOpen,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { colors } from '../../styles/theme';
import { getMarketingAnalytics, getRecentScans } from '../../api/storeAnalytics';
import type { MarketingAnalyticsData, RecentScanItem } from '../../api/storeAnalytics';

export function StoreMarketingDashboardPage() {
  const [analytics, setAnalytics] = useState<MarketingAnalyticsData | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, scansRes] = await Promise.all([
        getMarketingAnalytics(),
        getRecentScans(),
      ]);
      if (analyticsRes.success && analyticsRes.data) {
        setAnalytics(analyticsRes.data);
      }
      if (scansRes.success && scansRes.data) {
        setRecentScans(scansRes.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

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

  if (!analytics) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <BarChart3 size={48} style={{ color: colors.neutral300 }} />
          <p style={{ color: colors.neutral500, fontSize: '14px', marginTop: '12px' }}>데이터를 불러올 수 없습니다</p>
        </div>
      </div>
    );
  }

  const deviceIcon: Record<string, React.ReactNode> = {
    mobile: <Smartphone size={13} style={{ color: '#2563eb' }} />,
    tablet: <Tablet size={13} style={{ color: '#7c3aed' }} />,
    desktop: <Monitor size={13} style={{ color: '#059669' }} />,
  };
  const deviceLabel: Record<string, string> = { mobile: '모바일', tablet: '태블릿', desktop: '데스크톱' };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Link to="/store" style={{ color: colors.neutral400, fontSize: '13px', textDecoration: 'none' }}>
              매장 관리
            </Link>
            <span style={{ color: colors.neutral300 }}>/</span>
            <span style={{ color: colors.neutral600, fontSize: '13px' }}>마케팅 대시보드</span>
          </div>
          <h1 style={styles.title}>마케팅 대시보드</h1>
          <p style={styles.subtitle}>매장 마케팅 현황을 한눈에 파악합니다</p>
        </div>
        <button onClick={fetchData} style={styles.refreshBtn}>
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <TrendingUp size={20} style={{ color: colors.primary, marginBottom: '8px' }} />
          <p style={styles.kpiValue}>{analytics.totalScans.toLocaleString()}</p>
          <p style={styles.kpiLabel}>총 스캔</p>
        </div>
        <div style={styles.kpiCard}>
          <BarChart3 size={20} style={{ color: '#2563eb', marginBottom: '8px' }} />
          <p style={styles.kpiValue}>{analytics.todayScans.toLocaleString()}</p>
          <p style={styles.kpiLabel}>오늘</p>
        </div>
        <div style={styles.kpiCard}>
          <BarChart3 size={20} style={{ color: '#7c3aed', marginBottom: '8px' }} />
          <p style={styles.kpiValue}>{analytics.weeklyScans.toLocaleString()}</p>
          <p style={styles.kpiLabel}>이번주</p>
        </div>
        <div style={styles.kpiCard}>
          <QrCode size={20} style={{ color: '#059669', marginBottom: '8px' }} />
          <p style={styles.kpiValue}>{analytics.activeQrCount}</p>
          <p style={styles.kpiLabel}>활성 QR</p>
        </div>
      </div>

      {/* Two Column: Top QR + Recent Scans */}
      <div style={styles.twoCol}>
        {/* Top QR Performance */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>마케팅 성과 TOP 5</h2>
            <Link to="/store/analytics/marketing" style={styles.seeAllLink}>
              전체 보기 <ArrowRight size={12} />
            </Link>
          </div>
          {analytics.topQrCodes.length === 0 ? (
            <p style={styles.emptyText}>스캔 데이터가 없습니다</p>
          ) : (
            <div style={styles.topList}>
              {analytics.topQrCodes.slice(0, 5).map((qr, idx) => (
                <div key={qr.id} style={styles.topItem}>
                  <span style={styles.topRank}>{idx + 1}</span>
                  <div style={styles.topInfo}>
                    <p style={styles.topTitle}>{qr.title}</p>
                    <span style={styles.topSlug}>/qr/{qr.slug}</span>
                  </div>
                  <span style={styles.topCount}>{qr.scanCount}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>최근 활동</h2>
          </div>
          {recentScans.length === 0 ? (
            <p style={styles.emptyText}>최근 스캔 기록이 없습니다</p>
          ) : (
            <div style={styles.recentList}>
              {recentScans.slice(0, 8).map((scan, idx) => (
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

      {/* Quick Actions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>빠른 이동</h2>
        <div style={styles.quickGrid}>
          <Link to="/store/marketing/qr" style={styles.quickCard}>
            <QrCode size={24} style={{ color: colors.primary }} />
            <p style={styles.quickLabel}>QR 관리</p>
            <p style={styles.quickDesc}>QR 코드 생성 및 관리</p>
          </Link>
          <Link to="/store/marketing/pop" style={styles.quickCard}>
            <Megaphone size={24} style={{ color: '#f59e0b' }} />
            <p style={styles.quickLabel}>POP 자료</p>
            <p style={styles.quickDesc}>POP 광고 PDF 생성</p>
          </Link>
          <Link to="/store/operation/library" style={styles.quickCard}>
            <BookOpen size={24} style={{ color: '#059669' }} />
            <p style={styles.quickLabel}>자료실</p>
            <p style={styles.quickDesc}>매장 자료 관리</p>
          </Link>
          <Link to="/store/marketing/signage" style={styles.quickCard}>
            <Monitor size={24} style={{ color: '#2563eb' }} />
            <p style={styles.quickLabel}>사이니지</p>
            <p style={styles.quickDesc}>디지털 디스플레이 관리</p>
          </Link>
          <Link to="/store/analytics/marketing" style={styles.quickCard}>
            <BarChart3 size={24} style={{ color: '#7c3aed' }} />
            <p style={styles.quickLabel}>상세 분석</p>
            <p style={styles.quickDesc}>마케팅 성과 분석</p>
          </Link>
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
    fontFamily: 'monospace',
  },
  topCount: {
    fontSize: '14px',
    fontWeight: 700,
    color: colors.primary,
    flexShrink: 0,
  },

  // Recent Scans
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

  // Quick Actions
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '12px',
  },
  quickCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 12px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '10px',
    backgroundColor: colors.neutral50,
    textDecoration: 'none',
    textAlign: 'center',
    transition: 'border-color 0.15s',
    cursor: 'pointer',
  },
  quickLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: '10px 0 2px',
  },
  quickDesc: {
    fontSize: '11px',
    color: colors.neutral500,
    margin: 0,
  },
};

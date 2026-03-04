/**
 * MarketingAnalyticsPage — 매장 마케팅 분석
 *
 * WO-O4O-MARKETING-ANALYTICS-V1
 *
 * 조직 전체 QR 스캔 KPI + TOP QR + 디바이스 분포 + 일별 추이.
 */

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, QrCode, Smartphone, Monitor, Tablet, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { colors } from '../../styles/theme';
import { getMarketingAnalytics } from '../../api/storeAnalytics';
import type { MarketingAnalyticsData } from '../../api/storeAnalytics';

export function MarketingAnalyticsPage() {
  const [data, setData] = useState<MarketingAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMarketingAnalytics();
      if (res.success && res.data) {
        setData(res.data);
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

  if (!data) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <BarChart3 size={48} style={{ color: colors.neutral300 }} />
          <p style={{ color: colors.neutral500, fontSize: '14px', marginTop: '12px' }}>데이터를 불러올 수 없습니다</p>
        </div>
      </div>
    );
  }

  const maxDaily = Math.max(...data.dailyScans.map((d) => d.count), 1);
  const totalDeviceScans = data.deviceStats.mobile + data.deviceStats.tablet + data.deviceStats.desktop;

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
            <span style={{ color: colors.neutral600, fontSize: '13px' }}>마케팅 분석</span>
          </div>
          <h1 style={styles.title}>마케팅 분석</h1>
          <p style={styles.subtitle}>QR 스캔 데이터 기반 매장 마케팅 성과를 분석합니다</p>
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
          <p style={styles.kpiValue}>{data.totalScans.toLocaleString()}</p>
          <p style={styles.kpiLabel}>총 스캔</p>
        </div>
        <div style={styles.kpiCard}>
          <BarChart3 size={20} style={{ color: '#2563eb', marginBottom: '8px' }} />
          <p style={styles.kpiValue}>{data.todayScans.toLocaleString()}</p>
          <p style={styles.kpiLabel}>오늘</p>
        </div>
        <div style={styles.kpiCard}>
          <BarChart3 size={20} style={{ color: '#7c3aed', marginBottom: '8px' }} />
          <p style={styles.kpiValue}>{data.weeklyScans.toLocaleString()}</p>
          <p style={styles.kpiLabel}>이번주</p>
        </div>
        <div style={styles.kpiCard}>
          <QrCode size={20} style={{ color: '#059669', marginBottom: '8px' }} />
          <p style={styles.kpiValue}>{data.activeQrCount}</p>
          <p style={styles.kpiLabel}>활성 QR</p>
        </div>
      </div>

      {/* Daily Scan Trend */}
      {data.dailyScans.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>일별 스캔 추이 (최근 14일)</h2>
          <div style={styles.chartContainer}>
            {data.dailyScans.map((day) => (
              <div key={day.date} style={styles.chartBar}>
                <div style={styles.chartBarInner}>
                  <div
                    style={{
                      ...styles.chartBarFill,
                      height: `${(day.count / maxDaily) * 100}%`,
                    }}
                  />
                </div>
                <span style={styles.chartBarCount}>{day.count}</span>
                <span style={styles.chartBarLabel}>{day.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column: Top QR + Device Stats */}
      <div style={styles.twoCol}>
        {/* Top QR */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>인기 QR TOP 10</h2>
          {data.topQrCodes.length === 0 ? (
            <p style={styles.emptyText}>스캔 데이터가 없습니다</p>
          ) : (
            <div style={styles.topList}>
              {data.topQrCodes.map((qr, idx) => (
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

        {/* Device Distribution */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>디바이스 분포</h2>
          {totalDeviceScans === 0 ? (
            <p style={styles.emptyText}>스캔 데이터가 없습니다</p>
          ) : (
            <div style={styles.deviceList}>
              {([
                { key: 'mobile', label: '모바일', icon: <Smartphone size={16} />, color: '#2563eb' },
                { key: 'tablet', label: '태블릿', icon: <Tablet size={16} />, color: '#7c3aed' },
                { key: 'desktop', label: '데스크톱', icon: <Monitor size={16} />, color: '#059669' },
              ] as const).map((device) => {
                const count = data.deviceStats[device.key];
                const pct = totalDeviceScans > 0 ? Math.round((count / totalDeviceScans) * 100) : 0;
                return (
                  <div key={device.key} style={styles.deviceRow}>
                    <div style={styles.deviceLabel}>
                      {device.icon}
                      <span>{device.label}</span>
                    </div>
                    <div style={styles.deviceBarBg}>
                      <div
                        style={{
                          ...styles.deviceBarFill,
                          width: `${pct}%`,
                          backgroundColor: device.color,
                        }}
                      />
                    </div>
                    <span style={styles.deviceCount}>{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
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

  // Section
  section: {
    padding: '20px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    backgroundColor: '#fff',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: '0 0 16px',
  },
  emptyText: {
    fontSize: '13px',
    color: colors.neutral400,
    textAlign: 'center',
    padding: '20px 0',
    margin: 0,
  },

  // Daily Chart
  chartContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '4px',
    height: '160px',
    paddingTop: '10px',
  },
  chartBar: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
  },
  chartBarInner: {
    flex: 1,
    width: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  chartBarFill: {
    width: '70%',
    minHeight: '2px',
    backgroundColor: colors.primary,
    borderRadius: '3px 3px 0 0',
    transition: 'height 0.3s',
  },
  chartBarCount: {
    fontSize: '10px',
    color: colors.neutral600,
    fontWeight: 600,
    marginTop: '4px',
  },
  chartBarLabel: {
    fontSize: '10px',
    color: colors.neutral400,
    marginTop: '2px',
  },

  // Two column
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
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

  // Device Distribution
  deviceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  deviceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  deviceLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    width: '80px',
    fontSize: '13px',
    color: colors.neutral600,
    flexShrink: 0,
  },
  deviceBarBg: {
    flex: 1,
    height: '20px',
    backgroundColor: colors.neutral100,
    borderRadius: '10px',
    overflow: 'hidden',
  },
  deviceBarFill: {
    height: '100%',
    borderRadius: '10px',
    transition: 'width 0.3s',
  },
  deviceCount: {
    fontSize: '12px',
    fontWeight: 600,
    color: colors.neutral600,
    width: '80px',
    textAlign: 'right',
    flexShrink: 0,
  },
};

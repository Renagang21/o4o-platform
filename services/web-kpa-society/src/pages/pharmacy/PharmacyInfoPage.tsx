/**
 * PharmacyInfoPage — 약국 정보 조회 (Read-Only)
 *
 * WO-KPA-PHARMACY-HUB-NAVIGATION-RESTRUCTURE-V1 Step 8
 *
 * Store 사이드바 "약국 정보" 메뉴에서 진입.
 * fetchStoreHubOverview()의 organization 데이터를 표시.
 * 수정 기능은 Phase 2에서 제공 예정.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import { fetchStoreHubOverview, type StoreHubOverview } from '../../api/storeHub';

type LoadState = 'loading' | 'loaded' | 'error';

export function PharmacyInfoPage() {
  const [overview, setOverview] = useState<StoreHubOverview | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchStoreHubOverview();
        if (cancelled) return;
        setOverview(data);
        setLoadState('loaded');
      } catch {
        if (!cancelled) setLoadState('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loadState === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <p style={styles.loadingText}>약국 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (loadState === 'error' || !overview) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <p style={styles.errorText}>약국 정보를 불러올 수 없습니다.</p>
          <Link to="/store" style={styles.backButton}>돌아가기</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.pageTitle}>약국 정보</h1>
        <p style={styles.pageDesc}>약국 기본 정보를 확인할 수 있습니다.</p>
      </header>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardIcon}>🏥</span>
          <h2 style={styles.cardTitle}>기본 정보</h2>
        </div>

        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>약국명</span>
          <span style={styles.infoValue}>{overview.organizationName ?? '-'}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>조직 ID</span>
          <span style={styles.infoValueMono}>{overview.organizationId}</span>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardIcon}>📊</span>
          <h2 style={styles.cardTitle}>운영 현황</h2>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{overview.contents.totalSlotCount}</span>
            <span style={styles.statLabel}>콘텐츠 슬롯</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{overview.signage.pharmacy.contentCount}</span>
            <span style={styles.statLabel}>사이니지 콘텐츠</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{overview.signage.pharmacy.activeCount}</span>
            <span style={styles.statLabel}>활성 사이니지</span>
          </div>
        </div>
      </div>

      <div style={styles.noticeBox}>
        <span style={styles.noticeIcon}>ℹ️</span>
        <div>
          <p style={styles.noticeTitle}>정보 수정 안내</p>
          <p style={styles.noticeText}>
            약국 정보 수정 기능은 준비 중입니다. 변경이 필요한 경우 관리자에게 문의해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: '0 0 4px',
  },
  pageDesc: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    margin: 0,
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: '24px',
    marginBottom: '16px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  cardIcon: {
    fontSize: '1.25rem',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },

  // Info rows
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  infoLabel: {
    fontSize: '0.875rem',
    color: colors.neutral500,
  },
  infoValue: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral800,
  },
  infoValueMono: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.neutral600,
    fontFamily: 'monospace',
  },

  // Stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.md,
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.primary,
  },
  statLabel: {
    fontSize: '0.75rem',
    color: colors.neutral500,
    marginTop: '4px',
  },

  // Notice
  noticeBox: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#eff6ff',
    borderRadius: borderRadius.md,
    border: '1px solid #bfdbfe',
  },
  noticeIcon: {
    fontSize: '1.25rem',
    flexShrink: 0,
  },
  noticeTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.neutral800,
    margin: '0 0 4px',
  },
  noticeText: {
    fontSize: '0.8125rem',
    color: colors.neutral600,
    margin: 0,
    lineHeight: 1.5,
  },

  // Loading/Error
  loadingBox: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '300px',
  },
  loadingText: {
    color: colors.neutral500,
    fontSize: '0.9375rem',
  },
  errorBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    gap: '16px',
  },
  errorText: {
    color: colors.neutral600,
    fontSize: '0.9375rem',
  },
  backButton: {
    padding: '8px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 500,
  },
};

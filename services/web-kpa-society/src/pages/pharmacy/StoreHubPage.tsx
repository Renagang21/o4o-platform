/**
 * StoreHubPage — 통합 매장 허브 (읽기 전용 집계)
 *
 * WO-STORE-HUB-UNIFIED-RENDERING-PHASE1-V1
 *
 * 3 cards: Products / Contents / Signage
 * Each card: status badge, count summary, deep link button
 * Read-only aggregation, no new tables, graceful degradation.
 */

import { useEffect, useState } from 'react';
import { fetchStoreHubOverview, type StoreHubOverview } from '../../api/storeHub';
import { colors, shadows, borderRadius, spacing } from '../../styles/theme';

type LoadState = 'loading' | 'loaded' | 'error' | 'unauthorized';

export function StoreHubPage() {
  const [state, setState] = useState<LoadState>('loading');
  const [overview, setOverview] = useState<StoreHubOverview | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchStoreHubOverview();
        if (cancelled) return;
        setOverview(data);
        setState('loaded');
      } catch (err: any) {
        if (cancelled) return;
        if (err?.response?.status === 403) {
          setState('unauthorized');
        } else {
          setState('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Unauthorized ──
  if (state === 'unauthorized') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <a href="/pharmacy/hub" style={styles.backLink}>&larr; 대시보드</a>
          <h1 style={styles.title}>사이버 매장 허브</h1>
        </div>
        <div style={styles.messageBox}>
          <span style={{ fontSize: '1.5rem' }}>&#128274;</span>
          <p style={styles.messageText}>약국 개설자 또는 운영자 권한이 필요합니다.</p>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (state === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <a href="/pharmacy/hub" style={styles.backLink}>&larr; 대시보드</a>
          <h1 style={styles.title}>사이버 매장 허브</h1>
        </div>
        <p style={{ color: colors.neutral500, textAlign: 'center', padding: spacing.xl }}>
          매장 정보를 불러오는 중...
        </p>
      </div>
    );
  }

  // ── Error ──
  if (state === 'error') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <a href="/pharmacy/hub" style={styles.backLink}>&larr; 대시보드</a>
          <h1 style={styles.title}>사이버 매장 허브</h1>
        </div>
        <div style={styles.messageBox}>
          <p style={styles.messageText}>매장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
        </div>
      </div>
    );
  }

  // ── No data (user not in org) ──
  if (!overview) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <a href="/pharmacy/hub" style={styles.backLink}>&larr; 대시보드</a>
          <h1 style={styles.title}>사이버 매장 허브</h1>
        </div>
        <div style={styles.messageBox}>
          <p style={styles.messageText}>소속된 조직이 없어 매장 정보를 표시할 수 없습니다.</p>
        </div>
      </div>
    );
  }

  // ── Loaded ──
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <a href="/pharmacy/hub" style={styles.backLink}>&larr; 대시보드</a>
        <h1 style={styles.title}>사이버 매장 허브</h1>
        {overview.organizationName && (
          <p style={styles.orgName}>{overview.organizationName}</p>
        )}
      </div>

      <div style={styles.cardGrid}>
        {/* ── Card 1: Products ── */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>&#128722;</span>
            <h2 style={styles.cardTitle}>상품 (Products)</h2>
          </div>
          <div style={styles.cardBody}>
            <ServiceRow
              label="GlycoPharm 상품"
              count={overview.products.glycopharm.totalCount}
              link={overview.products.glycopharm.link}
            />
            <ServiceRow
              label="K-Cosmetics 상품"
              count={overview.products.cosmetics.listedCount}
              link={overview.products.cosmetics.link}
            />
          </div>
        </div>

        {/* ── Card 2: Contents ── */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>&#128196;</span>
            <h2 style={styles.cardTitle}>콘텐츠 (Contents)</h2>
          </div>
          <div style={styles.cardBody}>
            {overview.contents.slots.length > 0 ? (
              overview.contents.slots.map((slot, i) => (
                <ServiceRow
                  key={`${slot.serviceKey}-${slot.slotKey}-${i}`}
                  label={`${slot.serviceKey} / ${slot.slotKey}`}
                  count={slot.count}
                  link={slot.link}
                />
              ))
            ) : (
              <EmptyRow label="등록된 콘텐츠 슬롯이 없습니다" link="/operator/content" />
            )}
            <div style={styles.totalRow}>
              <span>전체 슬롯 수</span>
              <strong>{overview.contents.totalSlotCount}</strong>
            </div>
          </div>
        </div>

        {/* ── Card 3: Signage ── */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>&#128250;</span>
            <h2 style={styles.cardTitle}>사이니지 (Signage)</h2>
          </div>
          <div style={styles.cardBody}>
            <ServiceRow
              label="약국 사이니지"
              count={overview.signage.pharmacy.contentCount}
              link={overview.signage.pharmacy.link}
              extra={`활성 ${overview.signage.pharmacy.activeCount}건`}
            />
          </div>
        </div>

        {/* ── Card 4: Copied Assets (WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1) ── */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>&#128203;</span>
            <h2 style={styles.cardTitle}>복사된 자산 (Assets)</h2>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.row}>
              <div style={styles.rowLeft}>
                <span style={styles.rowLabel}>커뮤니티에서 복사한 CMS/사이니지 자산</span>
              </div>
              <div style={styles.rowRight}>
                <a href="/pharmacy/store-assets" style={styles.deepLink}>자산 목록 보기 &rarr;</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p style={styles.footer}>
        이 화면은 각 서비스 데이터를 읽기 전용으로 집계합니다. 편집은 각 서비스 허브에서 진행해주세요.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────

function ServiceRow({
  label,
  count,
  link,
  extra,
}: {
  label: string;
  count: number;
  link: string;
  extra?: string;
}) {
  const hasData = count > 0;
  return (
    <div style={styles.row}>
      <div style={styles.rowLeft}>
        <span style={hasData ? styles.badgeConnected : styles.badgeEmpty}>
          {hasData ? '연결됨' : '데이터없음'}
        </span>
        <span style={styles.rowLabel}>{label}</span>
      </div>
      <div style={styles.rowRight}>
        <span style={styles.rowCount}>{count}건</span>
        {extra && <span style={styles.rowExtra}>{extra}</span>}
        <a href={link} style={styles.deepLink}>편집하러 가기 &rarr;</a>
      </div>
    </div>
  );
}

function EmptyRow({ label, link }: { label: string; link: string }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowLeft}>
        <span style={styles.badgeEmpty}>데이터없음</span>
        <span style={{ ...styles.rowLabel, color: colors.neutral400 }}>{label}</span>
      </div>
      <div style={styles.rowRight}>
        <a href={link} style={styles.deepLink}>등록하러 가기 &rarr;</a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 960,
    margin: '0 auto',
    padding: spacing.xl,
    fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
  },
  header: {
    marginBottom: spacing.lg,
  },
  backLink: {
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '0.875rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: colors.neutral900,
    margin: `${spacing.sm} 0 0`,
  },
  orgName: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    margin: `${spacing.xs} 0 0`,
  },
  messageBox: {
    textAlign: 'center' as const,
    padding: spacing.xxl,
    background: colors.neutral50,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral200}`,
  },
  messageText: {
    color: colors.neutral600,
    marginTop: spacing.sm,
  },

  // Card grid
  cardGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing.lg,
  },
  card: {
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.md} ${spacing.lg}`,
    borderBottom: `1px solid ${colors.neutral100}`,
    background: colors.neutral50,
  },
  cardIcon: {
    fontSize: '1.25rem',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 500,
    color: colors.neutral800,
    margin: 0,
  },
  cardBody: {
    padding: spacing.md,
  },

  // Rows
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing.sm} ${spacing.sm}`,
    borderBottom: `1px solid ${colors.neutral100}`,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
  },
  rowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowRight: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowLabel: {
    fontSize: '0.875rem',
    color: colors.neutral700,
  },
  rowCount: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.neutral800,
  },
  rowExtra: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },

  // Badges
  badgeConnected: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    fontSize: '0.75rem',
    fontWeight: 500,
    background: '#DCFCE7',
    color: '#166534',
  },
  badgeEmpty: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    fontSize: '0.75rem',
    fontWeight: 500,
    background: colors.neutral100,
    color: colors.neutral500,
  },

  // Deep link
  deepLink: {
    fontSize: '0.8125rem',
    color: colors.primary,
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
  },

  // Total row
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: `${spacing.sm} ${spacing.sm}`,
    fontSize: '0.875rem',
    color: colors.neutral600,
  },

  // Footer
  footer: {
    marginTop: spacing.lg,
    fontSize: '0.75rem',
    color: colors.neutral400,
    textAlign: 'center' as const,
  },
};

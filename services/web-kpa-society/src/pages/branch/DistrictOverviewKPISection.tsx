/**
 * DistrictOverviewKPISection.tsx
 * 지부 통합 관제 KPI 카드 (district:admin 최상단)
 *
 * WO-KPA-B-DISTRICT-OVERVIEW-KPI-V1
 *
 * API 1 call로 totalBranches/totalMembers/totalPending/totalRecentActivity 표시.
 * skeleton loading 적용. HierarchySection 수정 없음.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

interface OverviewTotals {
  totalBranches: number;
  totalMembers: number;
  totalPending: number;
  totalRecentActivity: number;
}

interface OverviewSummaryResponse {
  data: {
    district: { id: string; name: string };
    totals: OverviewTotals;
  };
}

const KPI_ITEMS: Array<{ key: keyof OverviewTotals; icon: string; label: string }> = [
  { key: 'totalBranches', icon: '🏢', label: '전체 분회' },
  { key: 'totalMembers', icon: '👥', label: '전체 회원' },
  { key: 'totalPending', icon: '⏳', label: '승인 대기' },
  { key: 'totalRecentActivity', icon: '📊', label: '최근 활동' },
];

/** Skeleton KPI 카드 1개 */
function SkeletonKpi() {
  return (
    <div style={s.kpiCard}>
      <div style={{ ...s.skeletonBox, width: '1.5rem', height: '1.5rem', borderRadius: '4px' }} />
      <div>
        <div style={{ ...s.skeletonBox, width: '3rem', height: '0.75rem', marginBottom: '6px' }} />
        <div style={{ ...s.skeletonBox, width: '2rem', height: '1.25rem' }} />
      </div>
    </div>
  );
}

export function DistrictOverviewKPISection() {
  const { branchId } = useParams<{ branchId: string }>();
  const [totals, setTotals] = useState<OverviewTotals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    apiClient.get<OverviewSummaryResponse>(`/district/${branchId}/overview-summary`)
      .then((res) => {
        setTotals(res.data?.totals || null);
      })
      .catch(() => {
        setTotals({ totalBranches: 0, totalMembers: 0, totalPending: 0, totalRecentActivity: 0 });
      })
      .finally(() => setLoading(false));
  }, [branchId]);

  return (
    <section>
      <style>{skeletonKeyframes}</style>
      <h3 style={s.sectionTitle}>지부 통합 현황</h3>
      <div style={s.kpiGrid}>
        {loading ? (
          <>
            <SkeletonKpi />
            <SkeletonKpi />
            <SkeletonKpi />
            <SkeletonKpi />
          </>
        ) : (
          KPI_ITEMS.map(({ key, icon, label }) => (
            <div key={key} style={s.kpiCard}>
              <span style={s.kpiIcon}>{icon}</span>
              <div>
                <div style={s.kpiLabel}>{label}</div>
                <div style={{
                  ...s.kpiValue,
                  color: key === 'totalPending' && (totals?.[key] ?? 0) > 0
                    ? '#dc2626'
                    : colors.neutral900,
                } as React.CSSProperties}>
                  {totals?.[key] ?? 0}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// ─── Skeleton keyframes ─────────────────────────────
const skeletonKeyframes = `
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
`;

// ─── Styles ──────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  sectionTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: `0 0 ${spacing.md} 0`,
  } as React.CSSProperties,

  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: spacing.md,
  },
  kpiCard: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    background: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral200}`,
    boxShadow: shadows.sm,
  },
  kpiIcon: { fontSize: '1.5rem' },
  kpiLabel: {
    ...typography.bodyS,
    color: colors.neutral500,
  } as React.CSSProperties,
  kpiValue: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: 0,
  } as React.CSSProperties,

  // Skeleton
  skeletonBox: {
    background: colors.neutral200,
    borderRadius: borderRadius.sm,
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  },
};

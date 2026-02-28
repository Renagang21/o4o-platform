/**
 * DistrictHierarchySection.tsx
 * 산하 분회 조직 맵 (카드형 트리)
 *
 * WO-KPA-B-ORG-HIERARCHY-VISUALIZATION-V1
 *
 * district:admin 대시보드 전용 카드.
 * API 1 call로 산하 분회 목록 + memberCount/pendingCount/recentActivityCount 표시.
 * URL의 branchId(= districtId)를 사용하여 데이터 fetch.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

interface BranchSummary {
  id: string;
  name: string;
  type: string;
  memberCount: number;
  pendingCount: number;
  recentActivityCount: number;
}

interface BranchesSummaryResponse {
  data: {
    districtId: string;
    districtName: string;
    branches: BranchSummary[];
    totalBranches: number;
  };
}

export function DistrictHierarchySection() {
  const { branchId } = useParams<{ branchId: string }>();
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    setError(false);
    apiClient.get<BranchesSummaryResponse>(`/district/${branchId}/branches-summary`)
      .then((res) => {
        setBranches(res.data?.branches || []);
      })
      .catch(() => {
        setError(true);
        setBranches([]);
      })
      .finally(() => setLoading(false));
  }, [branchId]);

  return (
    <section>
      <h3 style={s.sectionTitle}>산하 분회 현황</h3>

      {loading ? (
        <div style={s.loadingBox}>
          <span style={s.loadingText}>분회 정보를 불러오는 중...</span>
        </div>
      ) : error ? (
        <div style={s.emptyBox}>
          <span style={s.emptyText}>분회 정보를 불러오지 못했습니다.</span>
        </div>
      ) : branches.length === 0 ? (
        <div style={s.emptyBox}>
          <span style={s.emptyText}>등록된 산하 분회가 없습니다.</span>
        </div>
      ) : (
        <>
          <div style={s.summaryBar}>
            <span style={s.summaryLabel}>총 {branches.length}개 분회</span>
            <span style={s.summaryLabel}>
              전체 회원 {branches.reduce((sum, b) => sum + b.memberCount, 0)}명
            </span>
            <span style={s.summaryLabel}>
              승인 대기 {branches.reduce((sum, b) => sum + b.pendingCount, 0)}명
            </span>
          </div>
          <div style={s.grid}>
            {branches.map((branch) => (
              <div key={branch.id} style={s.branchCard}>
                <div style={s.branchHeader}>
                  <span style={s.branchIcon}>🏢</span>
                  <h4 style={s.branchName}>{branch.name}</h4>
                </div>
                <div style={s.statsRow}>
                  <div style={s.stat}>
                    <span style={s.statValue}>{branch.memberCount}</span>
                    <span style={s.statLabel}>회원</span>
                  </div>
                  <div style={s.statDivider} />
                  <div style={s.stat}>
                    <span style={{
                      ...s.statValue,
                      color: branch.pendingCount > 0 ? '#dc2626' : colors.neutral900,
                    } as React.CSSProperties}>
                      {branch.pendingCount}
                    </span>
                    <span style={s.statLabel}>대기</span>
                  </div>
                  <div style={s.statDivider} />
                  <div style={s.stat}>
                    <span style={s.statValue}>{branch.recentActivityCount}</span>
                    <span style={s.statLabel}>최근 활동</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ─── Styles ──────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  sectionTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: `0 0 ${spacing.md} 0`,
  } as React.CSSProperties,

  // Summary bar
  summaryBar: {
    display: 'flex',
    gap: spacing.lg,
    marginBottom: spacing.md,
    padding: `${spacing.sm} ${spacing.md}`,
    background: colors.neutral50,
    borderRadius: borderRadius.md,
  },
  summaryLabel: {
    ...typography.bodyS,
    color: colors.neutral600,
    fontWeight: 500,
  } as React.CSSProperties,

  // Grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: spacing.md,
  },

  // Branch card
  branchCard: {
    background: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral200}`,
    boxShadow: shadows.sm,
    padding: spacing.lg,
  },
  branchHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  branchIcon: { fontSize: '1.25rem' },
  branchName: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
    fontSize: '0.9375rem',
  } as React.CSSProperties,

  // Stats row
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: 0,
    lineHeight: 1.2,
  } as React.CSSProperties,
  statLabel: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginTop: '2px',
  } as React.CSSProperties,
  statDivider: {
    width: '1px',
    height: '28px',
    background: colors.neutral200,
  },

  // Loading / empty states
  loadingBox: {
    padding: spacing.xl,
    textAlign: 'center',
    background: colors.neutral50,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.neutral200}`,
  },
  loadingText: {
    ...typography.bodyM,
    color: colors.neutral400,
  } as React.CSSProperties,
  emptyBox: {
    padding: spacing.xl,
    textAlign: 'center',
    background: colors.neutral50,
    borderRadius: borderRadius.md,
    border: `2px dashed ${colors.neutral300}`,
  },
  emptyText: {
    ...typography.bodyM,
    color: colors.neutral400,
  } as React.CSSProperties,
};

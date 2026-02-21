/**
 * StoreOrdersPage - 주문 관리
 * WO-STORE-ORDERS-FOUNDATION-V1 Phase B
 * WO-STORE-ORDERS-KPI-ENHANCEMENT-V1
 *
 * 공통 UI 프레임:
 * [1] KPI 4블록 (총 주문 / 진행 중 / 완료 / 이번 달 매출)
 * [2] 상태 필터 바
 * [3] 주문 테이블
 *
 * KPA-a는 아직 주문 API가 없으므로 빈 상태 UI를 표시한다.
 * API 연결은 후속 WO에서 진행한다.
 */

import { useState } from 'react';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

/* ── 상태 정의 ── */
const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '접수대기' },
  { key: 'confirmed', label: '처리중' },
  { key: 'shipped', label: '배송중' },
  { key: 'delivered', label: '완료' },
  { key: 'cancelled', label: '취소' },
] as const;

/* ── KPI 데이터 (API 미연결 — 공통 프레임 구조 유지) ── */
const EMPTY_KPI = [
  { label: '총 주문', value: '—', color: colors.neutral900 },
  { label: '진행 중', value: '—', color: colors.accentYellow },
  { label: '완료', value: '—', color: colors.accentGreen },
  { label: '이번 달 매출', value: '—', color: colors.primary },
];

export function StoreOrdersPage() {
  const [selectedStatus, setSelectedStatus] = useState('all');

  return (
    <div style={S.container}>
      {/* Header */}
      <div>
        <h1 style={S.title}>주문 관리</h1>
        <p style={S.subtitle}>B2B 구매 및 B2C 판매 주문을 관리합니다</p>
      </div>

      {/* [1] KPI 4블록 */}
      <div style={S.kpiGrid}>
        {EMPTY_KPI.map((kpi) => (
          <div key={kpi.label} style={S.kpiCard}>
            <p style={S.kpiLabel}>{kpi.label}</p>
            <p style={{ ...S.kpiValue, color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* [2] 상태 필터 바 */}
      <div style={S.filterBar}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatus(tab.key)}
            style={
              selectedStatus === tab.key
                ? { ...S.filterBtn, ...S.filterBtnActive }
                : S.filterBtn
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* [3] 테이블 헤더 */}
      <div style={S.tableCard}>
        <div style={S.tableHeader}>
          <span style={{ ...S.th, flex: 1.5 }}>주문번호</span>
          <span style={{ ...S.th, flex: 2 }}>고객/공급사</span>
          <span style={{ ...S.th, flex: 1 }}>금액</span>
          <span style={{ ...S.th, flex: 1 }}>상태</span>
          <span style={{ ...S.th, flex: 1.5 }}>생성일</span>
          <span style={{ ...S.th, flex: 1 }}>액션</span>
        </div>

        {/* 빈 상태 */}
        <div style={S.emptyState}>
          <div style={S.emptyIcon}>📦</div>
          <p style={S.emptyTitle}>주문 데이터가 없습니다</p>
          <p style={S.emptyDesc}>
            주문 기능이 연결되면 이 화면에서 주문을 관리할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Styles ── */
const S: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  title: {
    ...typography.headingL,
    margin: 0,
    color: colors.neutral900,
  },
  subtitle: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '0.875rem',
    color: colors.neutral500,
  },

  /* KPI */
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: spacing.md,
  },
  kpiCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
  },
  kpiLabel: {
    margin: 0,
    fontSize: '0.8rem',
    fontWeight: 500,
    color: colors.neutral500,
  },
  kpiValue: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '1.5rem',
    fontWeight: 700,
  },

  /* Filter */
  filterBar: {
    display: 'flex',
    gap: spacing.sm,
    overflowX: 'auto',
  },
  filterBtn: {
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral600,
    backgroundColor: colors.neutral100,
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  filterBtnActive: {
    backgroundColor: '#DBEAFE',
    color: colors.primary,
  },

  /* Table */
  tableCard: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    padding: `${spacing.sm} ${spacing.md}`,
    borderBottom: `1px solid ${colors.neutral200}`,
    backgroundColor: colors.neutral50,
  },
  th: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: colors.neutral500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  } as React.CSSProperties,

  /* Empty */
  emptyState: {
    textAlign: 'center',
    padding: `${spacing.xxxl} ${spacing.lg}`,
  } as React.CSSProperties,
  emptyIcon: {
    fontSize: '2.5rem',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral800,
  },
  emptyDesc: {
    margin: `${spacing.sm} 0 0`,
    fontSize: '0.875rem',
    color: colors.neutral500,
  },
};

/**
 * PharmacyDashboardTab - 약국경영 대시보드 탭
 *
 * Phase 4: 약국 개설자(pharmacy_owner) 전용 탭
 * - 약국 정보 요약 카드
 * - 약국경영 서비스 진입 버튼
 * - 안내 문구
 */

import { Link } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

export function PharmacyDashboardTab() {
  return (
    <div style={styles.container}>
      {/* 약국 정보 요약 */}
      <section style={styles.infoCard}>
        <div style={styles.infoHeader}>
          <span style={styles.infoIcon}>💊</span>
          <div>
            <h3 style={styles.infoTitle}>약국경영 서비스</h3>
            <p style={styles.infoDesc}>약국 운영에 필요한 경영지원 서비스를 이용할 수 있습니다.</p>
          </div>
        </div>
      </section>

      {/* 서비스 진입 버튼 */}
      <Link to="/pharmacy" style={styles.entryButton}>
        약국경영 서비스 바로가기 →
      </Link>

      {/* 안내 문구 */}
      <section style={styles.infoNote}>
        <p style={styles.noteText}>
          약국경영 서비스는 약국 개설자를 위한 별도 서비스입니다.
          B2B 거래, 약국 운영, 서비스 관리 등의 기능을 제공합니다.
        </p>
        <p style={styles.noteSubText}>
          약국 정보 변경이 필요한 경우 약국경영 서비스 내에서 수정할 수 있습니다.
        </p>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },

  // 약국 정보 카드
  infoCard: {
    background: colors.white,
    borderRadius: borderRadius.lg,
    border: `2px solid ${colors.primary}`,
    boxShadow: shadows.sm,
    padding: spacing.lg,
  },
  infoHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  infoIcon: {
    fontSize: '2rem',
    lineHeight: 1,
  },
  infoTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: 0,
  } as React.CSSProperties,
  infoDesc: {
    ...typography.bodyM,
    color: colors.neutral600,
    margin: `${spacing.xs} 0 0 0`,
  } as React.CSSProperties,

  // 진입 버튼
  entryButton: {
    display: 'block',
    textAlign: 'center',
    padding: `${spacing.md} ${spacing.lg}`,
    background: colors.primary,
    color: colors.white,
    borderRadius: borderRadius.lg,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '1rem',
    transition: 'background 0.2s',
  } as React.CSSProperties,

  // 안내 문구
  infoNote: {
    background: colors.neutral50,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    border: `1px solid ${colors.neutral200}`,
  },
  noteText: {
    ...typography.bodyM,
    color: colors.neutral700,
    margin: 0,
    lineHeight: 1.8,
  } as React.CSSProperties,
  noteSubText: {
    ...typography.bodyS,
    color: colors.neutral500,
    margin: `${spacing.sm} 0 0 0`,
  } as React.CSSProperties,
};

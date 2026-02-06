/**
 * MyServicesSection - 이용 중인 서비스 카드 UI
 *
 * "이용 중인 서비스" (status=approved) — 카드 강조, "바로 이동" CTA
 *
 * Note: "플랫폼이 권하는 서비스"는 약국경영 대시보드로 이동됨
 * → /pages/pharmacy/sections/RecommendedServicesSection.tsx
 *
 * WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1
 * WO-MY-DASHBOARD-SERVICE-CARDS-V1: 카드 그리드 UI 전환
 */

import { useState, useEffect } from 'react';
import { listPlatformServices } from '../api/platform-services';
import type { PlatformServiceItem } from '../api/platform-services';
import { colors, spacing, borderRadius, shadows, typography } from '../styles/theme';

export function MyServicesSection() {
  const [services, setServices] = useState<PlatformServiceItem[]>([]);

  useEffect(() => {
    listPlatformServices()
      .then(setServices)
      .catch(() => {});
  }, []);

  const enrolledServices = services.filter((s) => s.enrollmentStatus === 'approved');

  // 이용 중인 서비스가 없으면 렌더링하지 않음
  if (enrolledServices.length === 0) return null;

  return (
    <div style={styles.container}>
      {/* Section A: 이용 중인 서비스 */}
      {enrolledServices.length > 0 && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>이용 중인 서비스</h3>
          <div style={styles.grid}>
            {enrolledServices.map((svc) => (
              <div key={svc.code} style={styles.activeCard}>
                <div style={styles.cardTop}>
                  <span style={styles.cardIcon}>{svc.iconEmoji || '📦'}</span>
                  <span style={styles.activeBadge}>이용중</span>
                </div>
                <div style={styles.cardName}>{svc.name}</div>
                {svc.shortDescription && (
                  <div style={styles.cardDesc}>{svc.shortDescription}</div>
                )}
                <a
                  href={svc.entryUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.primaryButton}
                >
                  바로 이동
                </a>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xl,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: spacing.md,
  },

  // 이용 중인 서비스 카드 — 강조
  activeCard: {
    display: 'flex',
    flexDirection: 'column',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.md,
    border: `2px solid ${colors.primary}`,
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardIcon: {
    fontSize: '1.75rem',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.md,
    flexShrink: 0,
  },
  cardName: {
    ...typography.bodyL,
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '4px',
  },
  cardDesc: {
    ...typography.bodyM,
    color: colors.neutral500,
    marginBottom: spacing.md,
    lineHeight: 1.5,
    flex: 1,
  },

  // Badges
  activeBadge: {
    fontSize: '0.688rem',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: borderRadius.sm,
    backgroundColor: `${colors.primary}15`,
    color: colors.primary,
    whiteSpace: 'nowrap',
  },

  // Buttons
  primaryButton: {
    display: 'block',
    textAlign: 'center',
    padding: '8px 16px',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: '0.875rem',
    fontWeight: 600,
    textDecoration: 'none',
    marginTop: 'auto',
  },
};

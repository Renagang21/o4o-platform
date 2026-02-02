/**
 * MyServicesSection - 플랫폼 서비스 목록
 *
 * Section A: "이용 중인 서비스" (status=approved)
 * Section B: "플랫폼이 권하는 서비스" (featured, 미등록)
 *
 * WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1
 */

import { useState, useEffect } from 'react';
import { listPlatformServices, applyForService } from '../api/platform-services';
import type { PlatformServiceItem } from '../api/platform-services';
import { colors, spacing, borderRadius, shadows, typography } from '../styles/theme';

export function MyServicesSection() {
  const [services, setServices] = useState<PlatformServiceItem[]>([]);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);

  useEffect(() => {
    listPlatformServices()
      .then(setServices)
      .catch(() => {});
  }, []);

  const enrolledServices = services.filter((s) => s.enrollmentStatus === 'approved');
  const recommendedServices = services.filter(
    (s) => s.isFeatured && s.enrollmentStatus !== 'approved',
  );

  const handleApply = async (code: string) => {
    setApplyingCode(code);
    try {
      await applyForService(code);
      // Refresh list
      const updated = await listPlatformServices();
      setServices(updated);
    } catch {
      // silent
    } finally {
      setApplyingCode(null);
    }
  };

  if (services.length === 0) return null;

  return (
    <div style={styles.container}>
      {/* Section A: 이용 중인 서비스 */}
      {enrolledServices.length > 0 && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>이용 중인 서비스</h3>
          <div style={styles.grid}>
            {enrolledServices.map((svc) => (
              <a
                key={svc.code}
                href={svc.entryUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.card}
              >
                <div style={styles.cardIcon}>{svc.iconEmoji || '📦'}</div>
                <div style={styles.cardBody}>
                  <div style={styles.cardName}>{svc.name}</div>
                  {svc.shortDescription && (
                    <div style={styles.cardDesc}>{svc.shortDescription}</div>
                  )}
                </div>
                <span style={styles.chevron}>›</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Section B: 플랫폼이 권하는 서비스 */}
      {recommendedServices.length > 0 && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>플랫폼이 권하는 서비스</h3>
          <div style={styles.grid}>
            {recommendedServices.map((svc) => (
              <div key={svc.code} style={styles.card}>
                <div style={styles.cardIcon}>{svc.iconEmoji || '📦'}</div>
                <div style={styles.cardBody}>
                  <div style={styles.cardNameRow}>
                    <span style={styles.cardName}>{svc.name}</span>
                    {svc.isFeatured && (
                      <span style={styles.featuredBadge}>추천</span>
                    )}
                  </div>
                  {svc.shortDescription && (
                    <div style={styles.cardDesc}>{svc.shortDescription}</div>
                  )}
                </div>
                <div style={styles.cardAction}>
                  {svc.enrollmentStatus === 'applied' ? (
                    <span style={styles.pendingBadge}>승인 대기</span>
                  ) : svc.enrollmentStatus === 'rejected' ? (
                    <button
                      style={styles.applyButton}
                      onClick={() => handleApply(svc.code)}
                      disabled={applyingCode === svc.code}
                    >
                      재신청
                    </button>
                  ) : (
                    <button
                      style={styles.applyButton}
                      onClick={() => handleApply(svc.code)}
                      disabled={applyingCode === svc.code}
                    >
                      이용 신청
                    </button>
                  )}
                </div>
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
    gap: spacing.lg,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: colors.neutral100,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral100}`,
    overflow: 'hidden',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: `${spacing.md} ${spacing.lg}`,
    backgroundColor: colors.white,
    textDecoration: 'none',
    color: colors.neutral800,
    cursor: 'pointer',
  },
  cardIcon: {
    fontSize: '1.5rem',
    flexShrink: 0,
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.md,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardName: {
    ...typography.bodyL,
    fontWeight: 500,
    color: colors.neutral900,
  },
  cardDesc: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardAction: {
    flexShrink: 0,
  },
  chevron: {
    fontSize: '1.25rem',
    color: colors.neutral300,
    fontWeight: 300,
    flexShrink: 0,
  },
  featuredBadge: {
    fontSize: '0.625rem',
    fontWeight: 500,
    padding: '1px 6px',
    borderRadius: borderRadius.sm,
    backgroundColor: `${colors.primary}10`,
    color: colors.primary,
    whiteSpace: 'nowrap',
  },
  pendingBadge: {
    fontSize: '0.75rem',
    fontWeight: 500,
    padding: '4px 12px',
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    whiteSpace: 'nowrap',
  },
  applyButton: {
    fontSize: '0.75rem',
    fontWeight: 500,
    padding: '6px 14px',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};

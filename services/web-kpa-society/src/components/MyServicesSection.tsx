/**
 * MyServicesSection - 플랫폼 서비스 카드 UI
 *
 * Section A: "이용 중인 서비스" (status=approved) — 카드 강조, "바로 이동" CTA
 * Section B: "플랫폼이 권하는 서비스" (featured, 미등록) — 설명 중심, 상태별 버튼
 *
 * WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1
 * WO-MY-DASHBOARD-SERVICE-CARDS-V1: 카드 그리드 UI 전환
 */

import { useState, useEffect } from 'react';
import { listPlatformServices, applyForService } from '../api/platform-services';
import type { PlatformServiceItem } from '../api/platform-services';
import { colors, spacing, borderRadius, shadows, typography } from '../styles/theme';

export function MyServicesSection() {
  const [services, setServices] = useState<PlatformServiceItem[]>([]);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const [successApplied, setSuccessApplied] = useState<{ code: string; name: string } | null>(null);

  useEffect(() => {
    listPlatformServices()
      .then(setServices)
      .catch(() => {});
  }, []);

  const enrolledServices = services.filter((s) => s.enrollmentStatus === 'approved');
  const recommendedServices = services.filter(
    (s) => s.isFeatured && s.enrollmentStatus !== 'approved',
  );

  const handleApply = async (code: string, name: string) => {
    setApplyingCode(code);
    try {
      await applyForService(code);
      const updated = await listPlatformServices();
      setServices(updated);
      setSuccessApplied({ code, name });
    } catch {
      // silent
    } finally {
      setApplyingCode(null);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessApplied(null);
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

      {/* Section B: 플랫폼이 권하는 서비스 */}
      {recommendedServices.length > 0 && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>플랫폼이 권하는 서비스</h3>
          <div style={styles.grid}>
            {recommendedServices.map((svc) => (
              <div key={svc.code} style={styles.recommendCard}>
                <div style={styles.cardTop}>
                  <span style={styles.cardIcon}>{svc.iconEmoji || '📦'}</span>
                  {svc.isFeatured && <span style={styles.featuredBadge}>추천</span>}
                </div>
                <div style={styles.cardName}>{svc.name}</div>
                {svc.shortDescription && (
                  <div style={styles.cardDesc}>{svc.shortDescription}</div>
                )}
                <div style={styles.cardAction}>
                  {svc.enrollmentStatus === 'applied' ? (
                    <span style={styles.pendingBadge}>승인 대기</span>
                  ) : svc.enrollmentStatus === 'rejected' ? (
                    <button
                      style={styles.applyButton}
                      onClick={() => handleApply(svc.code, svc.name)}
                      disabled={applyingCode === svc.code}
                    >
                      재신청
                    </button>
                  ) : (
                    <button
                      style={styles.applyButton}
                      onClick={() => handleApply(svc.code, svc.name)}
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

      {/* Success Modal */}
      {successApplied && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalIconWrap}>
              <span style={styles.modalIcon}>✅</span>
            </div>
            <h3 style={styles.modalTitle}>가입신청이 완료되었습니다</h3>
            <p style={styles.modalDesc}>
              <strong>{successApplied.name}</strong> 서비스 이용 신청이 접수되었습니다.<br />
              운영자 승인 후 서비스를 이용하실 수 있습니다.
            </p>
            <button
              style={styles.modalButton}
              onClick={handleCloseSuccess}
            >
              확인
            </button>
          </div>
        </div>
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
  // 권장 서비스 카드 — 보조
  recommendCard: {
    display: 'flex',
    flexDirection: 'column',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral200}`,
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
  cardAction: {
    marginTop: 'auto',
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
  featuredBadge: {
    fontSize: '0.688rem',
    fontWeight: 500,
    padding: '3px 8px',
    borderRadius: borderRadius.sm,
    backgroundColor: '#FFF7ED',
    color: '#C2410C',
    whiteSpace: 'nowrap',
  },
  pendingBadge: {
    display: 'inline-block',
    fontSize: '0.813rem',
    fontWeight: 500,
    padding: '6px 16px',
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    whiteSpace: 'nowrap',
    textAlign: 'center',
    width: '100%',
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
  applyButton: {
    display: 'block',
    width: '100%',
    padding: '8px 16px',
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    color: colors.primary,
    fontSize: '0.875rem',
    fontWeight: 600,
    border: `1px solid ${colors.primary}`,
    cursor: 'pointer',
    textAlign: 'center',
  },

  // Success Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.lg,
    padding: spacing.xl,
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
  },
  modalIconWrap: {
    marginBottom: spacing.md,
  },
  modalIcon: {
    fontSize: '3rem',
  },
  modalTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: `0 0 ${spacing.sm}`,
  },
  modalDesc: {
    ...typography.bodyM,
    color: colors.neutral600,
    lineHeight: 1.6,
    margin: `0 0 ${spacing.lg}`,
  },
  modalButton: {
    display: 'inline-block',
    padding: `${spacing.sm} ${spacing.xl}`,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: '0.938rem',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    minWidth: '120px',
  },
};

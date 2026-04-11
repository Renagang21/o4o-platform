/**
 * FooterLinksSection - 하단 바로가기 링크/아이콘
 *
 * WO-KPA-A-HOME-FOOTER-LINKS-MANAGEMENT-V1
 *
 * 운영자가 Home 편집에서 관리하는 외부 링크 카드 그리드.
 * community_quick_links 테이블 데이터를 렌더링.
 * 데이터가 없으면 섹션을 숨긴다.
 */

import { useEffect } from 'react';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import type { CommunityQuickLink } from '../../api/community';

const responsiveStyles = `
  .footer-links-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: ${spacing.md};
  }
  @media (min-width: 768px) {
    .footer-links-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
`;

function LinkCard({ link }: { link: CommunityQuickLink }) {
  const linkProps = link.openInNewTab
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};

  return (
    <a href={link.linkUrl} {...linkProps} style={styles.card}>
      <img
        src={link.imageUrl}
        alt={link.title}
        style={styles.cardImage}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <span style={styles.cardTitle}>{link.title}</span>
      {link.description && (
        <span style={styles.cardDesc}>{link.description}</span>
      )}
    </a>
  );
}

export function FooterLinksSection({ quickLinks }: { quickLinks: CommunityQuickLink[] }) {
  useEffect(() => {
    const styleId = 'footer-links-responsive-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = responsiveStyles;
      document.head.appendChild(style);
    }
  }, []);

  if (!quickLinks || quickLinks.length === 0) return null;

  return (
    <section style={styles.container}>
      <h2 style={styles.sectionTitle}>바로가기</h2>
      <div className="footer-links-grid">
        {quickLinks.map((link) => (
          <LinkCard key={link.id} link={link} />
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.xl} 0`,
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginBottom: spacing.lg,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral200}`,
    textDecoration: 'none',
    color: colors.neutral800,
    transition: 'box-shadow 0.2s, border-color 0.2s',
    textAlign: 'center',
  },
  cardImage: {
    width: 48,
    height: 48,
    objectFit: 'contain',
    flexShrink: 0,
  },
  cardTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
  },
  cardDesc: {
    fontSize: '0.75rem',
    color: colors.neutral500,
    margin: 0,
    lineHeight: '1.4',
  },
};

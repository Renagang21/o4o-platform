/**
 * HubEntityCard — KPA 내부 Hub 카드 통합 컴포넌트
 * WO-O4O-SHARED-HUB-CARD-COMPONENT-V1
 *
 * LMS / Forum 카드를 동일 구조로 표현하기 위한 컴포넌트.
 * 썸네일은 지원하지 않는다. 다른 서비스(Glycopharm 등)로의 승격 전엔 KPA 전용.
 *
 * 렌더 순서:
 *   [badges row]                            ← LMS visibility 등
 *   [titlePrefix title][titleAside]         ← title row, 우측에 aside (예: Forum 글 수)
 *   [subline]                               ← Forum 개설자 줄
 *   [description]
 *   [children]                              ← 자유 슬롯
 *   ── 이하 marginTop: auto ──
 *   [bottomBadges + #tags chips]            ← 하나의 flex-wrap pill 행
 *   [meta]                                  ← 👤·⏱·👥
 *   [cta]                                   ← 풀폭 버튼 형태
 *
 * 클릭 동작:
 *   href가 있으면 카드 전체가 <Link>로 감싸진다.
 *   children 내부에 인터랙티브 요소를 넣을 경우 호출자가 e.stopPropagation()으로
 *   네비게이션 충돌을 막아야 한다. 본 컴포넌트 자체는 내부 인터랙티브 요소를 두지 않는다.
 */

import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from './Card';
import { colors, typography } from '../../styles/theme';

// 한 번만 주입되는 hover 스타일 (Card.tsx는 className/`:hover`를 지원하지 않음)
const HOVER_STYLE_ID = 'hub-entity-card-styles';
const HOVER_CSS = `
  .hub-entity-card-wrap > div {
    transition: box-shadow 0.2s ease;
  }
  .hub-entity-card-wrap:hover > div {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }
`;
function injectHoverStyleOnce() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(HOVER_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = HOVER_STYLE_ID;
  el.textContent = HOVER_CSS;
  document.head.appendChild(el);
}

export type HubBadgeColor = 'green' | 'purple' | 'orange' | 'gray' | 'blue';

export interface HubBadge {
  label: string;
  color?: HubBadgeColor;
}

export interface HubMeta {
  icon?: string;
  label: string;
}

export interface HubEntityCardProps {
  // Top
  badges?: HubBadge[];

  // Title row
  title: string;
  titlePrefix?: ReactNode;
  titleAside?: ReactNode;

  // Body
  subline?: string;
  description?: string;
  children?: ReactNode;

  // Bottom group (auto-pushed to card bottom)
  bottomBadges?: HubBadge[];
  tags?: string[];
  maxTags?: number;
  tagOverflowLabel?: (extra: number) => string;

  meta?: HubMeta[];
  cta?: { label: string; tone?: 'primary' | 'muted' };

  // Click target
  href?: string;
  state?: unknown;

  // Layout
  minHeight?: number;
  hover?: boolean;
}

const BADGE_PALETTE: Record<HubBadgeColor, { bg: string; fg: string }> = {
  green: { bg: '#dcfce7', fg: '#15803d' },
  purple: { bg: '#ede9fe', fg: '#5b21b6' },
  orange: { bg: '#FFF7ED', fg: '#EA580C' },
  gray: { bg: colors.neutral100, fg: colors.neutral500 },
  blue: { bg: '#EFF6FF', fg: '#3B82F6' },
};

function badgeStyle(color: HubBadgeColor = 'gray'): React.CSSProperties {
  const { bg, fg } = BADGE_PALETTE[color];
  return {
    display: 'inline-block',
    padding: '3px 10px',
    backgroundColor: bg,
    color: fg,
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };
}

const tagChipStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  backgroundColor: colors.neutral100,
  color: colors.neutral700,
  borderRadius: '4px',
  fontSize: '12px',
  whiteSpace: 'nowrap',
};

export function HubEntityCard({
  badges,
  title,
  titlePrefix,
  titleAside,
  subline,
  description,
  children,
  bottomBadges,
  tags,
  maxTags = 3,
  tagOverflowLabel = (extra) => `+${extra}`,
  meta,
  cta,
  href,
  state,
  minHeight,
  hover = true,
}: HubEntityCardProps) {
  useEffect(() => { injectHoverStyleOnce(); }, []);

  const visibleTags = tags ? tags.slice(0, maxTags) : [];
  const tagOverflowCount = tags && tags.length > maxTags ? tags.length - maxTags : 0;

  const hasBottomPillRow =
    (bottomBadges && bottomBadges.length > 0) || visibleTags.length > 0 || tagOverflowCount > 0;
  const hasMeta = meta && meta.length > 0;
  const hasCta = !!cta;
  const hasBottomGroup = hasBottomPillRow || hasMeta || hasCta;

  const cardBody = (
    <Card hover={hover} padding="medium" style={minHeight ? { minHeight } : undefined}>
      <div style={styles.inner}>
        {badges && badges.length > 0 && (
          <div style={styles.badgeRow}>
            {badges.map((b, i) => (
              <span key={`${b.label}-${i}`} style={badgeStyle(b.color)}>
                {b.label}
              </span>
            ))}
          </div>
        )}

        <div style={styles.titleRow}>
          <div style={styles.titleLeft}>
            {titlePrefix !== undefined && <span style={styles.titlePrefix}>{titlePrefix}</span>}
            <h3 style={styles.title}>{title}</h3>
          </div>
          {titleAside !== undefined && <div style={styles.titleAside}>{titleAside}</div>}
        </div>

        {subline && <p style={styles.subline}>{subline}</p>}
        {description && <p style={styles.description}>{description}</p>}

        {children}

        {hasBottomGroup && (
          <div style={styles.bottomGroup}>
            {hasBottomPillRow && (
              <div style={styles.pillRow}>
                {bottomBadges?.map((b, i) => (
                  <span key={`bb-${b.label}-${i}`} style={badgeStyle(b.color)}>
                    {b.label}
                  </span>
                ))}
                {visibleTags.map((t) => (
                  <span key={`tag-${t}`} style={tagChipStyle}>#{t}</span>
                ))}
                {tagOverflowCount > 0 && (
                  <span style={tagChipStyle}>{tagOverflowLabel(tagOverflowCount)}</span>
                )}
              </div>
            )}

            {hasMeta && (
              <div style={styles.metaRow}>
                {meta!.map((m, i) => (
                  <span key={`meta-${i}`} style={styles.metaItemWrap}>
                    {i > 0 && <span style={styles.metaSep}>·</span>}
                    <span style={styles.metaItem}>
                      {m.icon ? `${m.icon} ` : ''}
                      {m.label}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {hasCta && (
              <div style={styles.ctaRow}>
                <span style={ctaStyle(cta!.tone)}>{cta!.label}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );

  if (!href) {
    return (
      <div className="hub-entity-card-wrap" style={{ height: '100%' }}>
        {cardBody}
      </div>
    );
  }

  return (
    <Link
      to={href}
      state={state as any}
      className="hub-entity-card-wrap"
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      {cardBody}
    </Link>
  );
}

function ctaStyle(tone: 'primary' | 'muted' = 'primary'): React.CSSProperties {
  const isPrimary = tone === 'primary';
  return {
    display: 'inline-block',
    width: '100%',
    padding: '10px 14px',
    backgroundColor: isPrimary ? colors.primary : colors.neutral100,
    color: isPrimary ? colors.white : colors.neutral700,
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 600,
    boxSizing: 'border-box',
  };
}

const styles: Record<string, React.CSSProperties> = {
  inner: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    height: '100%',
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  titleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
    flex: 1,
  },
  titlePrefix: {
    fontSize: '1.25rem',
    flexShrink: 0,
    lineHeight: 1,
  },
  title: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  titleAside: {
    flexShrink: 0,
  },
  subline: {
    ...typography.bodyS,
    color: colors.neutral500,
    margin: 0,
  },
  description: {
    ...typography.bodyS,
    color: colors.neutral700,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  bottomGroup: {
    marginTop: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  pillRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '6px',
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    ...typography.bodyS,
    color: colors.neutral500,
  },
  metaItemWrap: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  metaItem: {
    whiteSpace: 'nowrap',
  },
  metaSep: {
    color: colors.neutral300,
    padding: '0 6px',
  },
  ctaRow: {
    paddingTop: '4px',
  },
};

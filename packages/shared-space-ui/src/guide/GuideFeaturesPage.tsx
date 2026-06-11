/**
 * GuideFeaturesPage — 기능별 이용 방법 (공통)
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 */

import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';
import type { GuideFeaturesPageProps } from './types.js';
import { heroStyles, sectionStyles, cardStyles, bottomNavStyles, indexStyles } from './styles.js';

export function GuideFeaturesPage({ hero, index, indexPosition = 'top', serviceShowcase, groups, bottomNav, renderText }: GuideFeaturesPageProps) {
  const atBottom = indexPosition === 'bottom';

  // WO-O4O-NETURE-GUIDE-ACTIVE-SERVICE-CARDS-AND-PAGES-V1: "현재 운영 중인 O4O 서비스" 쇼케이스.
  //   그룹 아래·index(bottom) 위에 렌더. 박스(indexStyles.wrap) 없이 섹션 헤더 + 카드 그리드 → 사업 적용 예시와 구분.
  const showcaseSection =
    serviceShowcase && serviceShowcase.cards.length > 0 ? (
      <PageSection style={{ paddingTop: 32 }}>
        <PageContainer>
          {serviceShowcase.title && <h2 style={indexStyles.title}>{serviceShowcase.title}</h2>}
          {serviceShowcase.lead && serviceShowcase.lead.length > 0 && (
            <ul style={indexStyles.leadList}>
              {serviceShowcase.lead.map((line) => (
                <li key={line} style={indexStyles.leadItem}>
                  <span style={indexStyles.leadDot} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
          <div style={cardStyles.gridLg}>
            {serviceShowcase.cards.map((card) => (
              <a key={card.to} href={card.to} style={indexStyles.card}>
                <div style={indexStyles.cardHead}>
                  <span style={indexStyles.cardTitle}>{card.title}</span>
                  {card.audience && <span style={indexStyles.audienceTag}>{card.audience}</span>}
                </div>
                <p style={indexStyles.cardSummary}>{card.summary}</p>
              </a>
            ))}
          </div>
        </PageContainer>
      </PageSection>
    ) : null;

  // Card index (선택적 카드 목차 — 사업자 유형 / 사업 적용 예시 등)
  // WO-O4O-NETURE-GUIDE-BUSINESS-EXAMPLES-BOTTOM-SECTION-FIX-V1: 'top'(기본) 또는 'bottom' 렌더.
  //   - top    : WO-O4O-GUIDE-HERO-SECTION-SPACING-STANDARD-V1 에 따라 첫 섹션 paddingTop(32) 밀착 보정.
  //   - bottom : 그룹 아래 마지막 섹션 — paddingTop 보정 불필요, last 로 하단 여백 제거.
  const indexSection =
    index && index.cards.length > 0 ? (
      <PageSection style={atBottom ? undefined : { paddingTop: 32 }} last={atBottom}>
        <PageContainer>
          <div style={indexStyles.wrap}>
            {index.title && <h2 style={indexStyles.title}>{index.title}</h2>}
            {index.lead && index.lead.length > 0 && (
              <ul style={indexStyles.leadList}>
                {index.lead.map((line) => (
                  <li key={line} style={indexStyles.leadItem}>
                    <span style={indexStyles.leadDot} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}
            <div style={cardStyles.gridLg}>
              {index.cards.map((card) => (
                <a key={card.to} href={card.to} style={indexStyles.card}>
                  <div style={indexStyles.cardHead}>
                    <span style={indexStyles.cardTitle}>{card.title}</span>
                    {card.audience && <span style={indexStyles.audienceTag}>{card.audience}</span>}
                  </div>
                  <p style={indexStyles.cardSummary}>{card.summary}</p>
                </a>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>
    ) : null;

  return (
    <div>
      {/* Hero */}
      <div style={heroStyles.heroLg}>
        <div style={heroStyles.heroInner}>
          <p style={heroStyles.eyebrow}>{hero.eyebrow}</p>
          <h1 style={heroStyles.titleLg}>{hero.title}</h1>
          <p style={heroStyles.desc}>
            {renderText ? renderText('hero-desc', hero.description) : hero.description}
          </p>
          <p style={heroStyles.flowBarTitle}>{hero.flowBarTitle}</p>
          <div style={heroStyles.flowBar}>
            {hero.flowLabels.map((label, idx, arr) => (
              <span key={label} style={heroStyles.flowBarItem}>
                <span style={heroStyles.flowBarLabel}>{label}</span>
                {idx < arr.length - 1 && <span style={heroStyles.flowBarArrow}>·</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card index — top (기본) */}
      {!atBottom && indexSection}

      {/* Group Sections */}
      {groups.map((group, idx) => (
        <PageSection key={group.step} last={!atBottom && idx === groups.length - 1}>
          <PageContainer>
            <div style={sectionStyles.wrapLg}>
              <div style={sectionStyles.headerLg}>
                <span style={sectionStyles.numberBadge}>{group.step}</span>
                <h2 style={sectionStyles.titleLg}>{group.title}</h2>
                <span style={sectionStyles.routeBadge}>{group.primaryRoute}</span>
              </div>
              <p style={sectionStyles.desc}>
                {renderText ? renderText(`group-${idx}-desc`, group.description) : group.description}
              </p>
              <div style={cardStyles.gridFeature}>
                {group.items.map((item) => (
                  <Link
                    key={item.route}
                    to={item.route.includes(':') ? group.linkTo : item.route}
                    style={cardStyles.link}
                  >
                    <p style={cardStyles.linkLabel}>{item.label}</p>
                    <p style={cardStyles.linkRoute}>{item.route}</p>
                  </Link>
                ))}
              </div>
            </div>
          </PageContainer>
        </PageSection>
      ))}

      {/* 현재 운영 중인 O4O 서비스 — 그룹 아래·사업 적용 예시 위 */}
      {showcaseSection}

      {/* Card index — bottom ("내 사업에 적용" 마무리 섹션) */}
      {atBottom && indexSection}

      {/* Bottom nav */}
      <div style={bottomNavStyles.wrap}>
        <PageContainer>
          <div style={bottomNavStyles.inner}>
            <Link to={bottomNav.prev.to} style={bottomNavStyles.muted}>{bottomNav.prev.label}</Link>
            <Link to={bottomNav.home.to} style={bottomNavStyles.muted}>{bottomNav.home.label}</Link>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

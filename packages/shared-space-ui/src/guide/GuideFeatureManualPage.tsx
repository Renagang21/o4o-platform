/**
 * GuideFeatureManualPage — 개별 기능 상세 매뉴얼 (공통)
 *
 * WO-O4O-GUIDE-FORUM-MANUAL-V1
 *
 * /guide/features/* 경로의 개별 기능 상세 매뉴얼 페이지를 위한 공통 컴포넌트.
 * Hero에 primary CTA (실제 기능으로 이동) 배치 + step 카드 섹션 + 하단 nav.
 */

import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';
import type { GuideFeatureManualPageProps } from './types.js';
import { heroStyles, sectionStyles, cardStyles, bottomNavStyles } from './styles.js';

export function GuideFeatureManualPage({ hero, sections, bottomNav, renderText }: GuideFeatureManualPageProps) {
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

          {/* Optional flow bar */}
          {hero.flowLabels && hero.flowLabels.length > 0 && (
            <>
              {hero.flowBarTitle && <p style={heroStyles.flowBarTitle}>{hero.flowBarTitle}</p>}
              <div style={heroStyles.flowBar}>
                {hero.flowLabels.map((label, idx, arr) => (
                  <span key={label} style={heroStyles.flowBarItem}>
                    <span style={heroStyles.flowBarLabel}>{label}</span>
                    {idx < arr.length - 1 && <span style={heroStyles.flowBarArrow}>→</span>}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Primary CTA — 실제 기능으로 이동 */}
          <div style={heroStyles.heroNav}>
            <Link to={hero.primaryAction.to} style={heroStyles.heroNavLink}>
              {hero.primaryAction.label}
            </Link>
          </div>
        </div>
      </div>

      {/* Step Sections */}
      {sections.map((section, idx) => (
        <PageSection key={section.step} last={idx === sections.length - 1}>
          <PageContainer>
            <div style={sectionStyles.wrapLg}>
              <div style={sectionStyles.headerLg}>
                <span style={sectionStyles.numberBadge}>{section.step}</span>
                <h2 style={sectionStyles.titleLg}>{section.title}</h2>
                {section.routeLabel && (
                  <span style={sectionStyles.routeBadge}>{section.routeLabel}</span>
                )}
              </div>
              <p style={sectionStyles.desc}>
                {renderText ? renderText(`section-${idx}-desc`, section.description) : section.description}
              </p>
              <div style={cardStyles.gridLg}>
                {section.items.map((item) => (
                  <div key={item.label} style={cardStyles.basic}>
                    <p style={cardStyles.basicLabel}>{item.label}</p>
                    <p style={cardStyles.basicDetail}>{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </PageContainer>
        </PageSection>
      ))}

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

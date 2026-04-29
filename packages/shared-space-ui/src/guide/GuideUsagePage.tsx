/**
 * GuideUsagePage — 서비스 활용 방법 (공통)
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 */

import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';
import type { GuideUsagePageProps } from './types.js';
import { heroStyles, sectionStyles, cardStyles, bottomNavStyles } from './styles.js';

export function GuideUsagePage({ hero, sections, bottomNav, renderText }: GuideUsagePageProps) {
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
                {idx < arr.length - 1 && <span style={heroStyles.flowBarArrow}>→</span>}
              </span>
            ))}
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
                <span style={sectionStyles.routeBadge}>{section.routeLabel}</span>
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
            <div style={bottomNavStyles.group}>
              <Link to={bottomNav.next.to} style={bottomNavStyles.primary}>{bottomNav.next.label}</Link>
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

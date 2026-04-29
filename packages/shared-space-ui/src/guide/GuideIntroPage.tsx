/**
 * GuideIntroPage — O4O 개요 (공통)
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 */

import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';
import type { GuideIntroPageProps } from './types.js';
import { heroStyles, sectionStyles, cardStyles, bottomNavStyles } from './styles.js';

export function GuideIntroPage({ hero, sections, bottomNav, renderText }: GuideIntroPageProps) {
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
          <div style={heroStyles.heroNav}>
            <Link to={hero.nextLink.to} style={heroStyles.heroNavLink}>{hero.nextLink.label}</Link>
          </div>
        </div>
      </div>

      {/* Sections */}
      {sections.map((section, idx) => (
        <PageSection key={section.title} last={idx === sections.length - 1}>
          <PageContainer>
            <div style={sectionStyles.wrapLg}>
              <div style={sectionStyles.headerLg}>
                <span style={sectionStyles.numberBadge}>0{idx + 1}</span>
                <Link to={section.href} style={sectionStyles.titleLink}>
                  <h2 style={sectionStyles.titleLg}>{section.title}</h2>
                  <span style={sectionStyles.arrow}>→</span>
                </Link>
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

      {/* Bottom Nav */}
      <div style={bottomNavStyles.wrap}>
        <PageContainer>
          <div style={bottomNavStyles.inner}>
            <Link to={bottomNav.home.to} style={bottomNavStyles.muted}>{bottomNav.home.label}</Link>
            <div style={bottomNavStyles.group}>
              <Link to={bottomNav.next.to} style={bottomNavStyles.primary}>{bottomNav.next.label}</Link>
              <Link to={bottomNav.features.to} style={bottomNavStyles.muted}>{bottomNav.features.label}</Link>
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

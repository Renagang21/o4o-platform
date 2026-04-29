/**
 * GuideFeaturesPage — 기능별 이용 방법 (공통)
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 */

import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';
import type { GuideFeaturesPageProps } from './types.js';
import { heroStyles, sectionStyles, cardStyles, bottomNavStyles } from './styles.js';

export function GuideFeaturesPage({ hero, groups, bottomNav, renderText }: GuideFeaturesPageProps) {
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

      {/* Group Sections */}
      {groups.map((group, idx) => (
        <PageSection key={group.step} last={idx === groups.length - 1}>
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

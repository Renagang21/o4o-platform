/**
 * GuideIntroConceptPage — 핵심 개념 (공통)
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 */

import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';
import type { GuideIntroConceptPageProps } from './types.js';
import {
  heroStyles,
  sectionStyles,
  cardStyles,
  compareStyles,
  featureListStyles,
  bottomNavStyles,
} from './styles.js';

export function GuideIntroConceptPage({
  hero,
  solidarity,
  structure,
  info,
  competition,
  summary,
  bottomNav,
}: GuideIntroConceptPageProps) {
  const cardSections = [solidarity, structure, info];

  return (
    <div>
      {/* Hero */}
      <div style={heroStyles.hero}>
        <div style={heroStyles.heroInner}>
          <p style={heroStyles.eyebrow}>{hero.eyebrow}</p>
          <h1 style={heroStyles.title}>{hero.title}</h1>
          <p style={heroStyles.descCompact}>{hero.description}</p>
          <div style={heroStyles.context}>
            {hero.context.map((row) => (
              <div key={row.label} style={heroStyles.contextRow}>
                <span style={heroStyles.contextLabel}>{row.label}</span>
                <span style={heroStyles.contextValue}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sections 1-3: solidarity / structure / info */}
      {cardSections.map((s) => (
        <PageSection key={s.sectionTitle}>
          <PageContainer>
            <div style={sectionStyles.wrap}>
              <h2 style={sectionStyles.titleSm}>{s.sectionTitle}</h2>
              <div style={cardStyles.grid}>
                {s.cards.map((card) => (
                  <div key={card.label} style={cardStyles.overview}>
                    <p style={cardStyles.overviewLabel}>{card.label}</p>
                    <p style={cardStyles.overviewSummary}>{card.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </PageContainer>
        </PageSection>
      ))}

      {/* Section 4: Competition */}
      <PageSection>
        <PageContainer>
          <div style={sectionStyles.wrap}>
            <h2 style={sectionStyles.titleSm}>{competition.sectionTitle}</h2>
            <div style={compareStyles.grid}>
              {competition.rows.map((row) => (
                <div key={row.label} style={row.dim ? compareStyles.cardDim : compareStyles.cardActive}>
                  <p style={row.dim ? compareStyles.labelDim : compareStyles.labelActive}>{row.label}</p>
                  <ul style={compareStyles.list}>
                    {row.items.map((item) => (
                      <li key={item} style={compareStyles.item}>
                        <span style={row.dim ? compareStyles.dotDim : compareStyles.dotActive} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div style={compareStyles.resultRow}>
              <span style={compareStyles.resultDot} />
              <span style={compareStyles.resultText}>{competition.resultText}</span>
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* Section 5: Summary */}
      <PageSection last>
        <PageContainer>
          <div style={sectionStyles.wrap}>
            <h2 style={sectionStyles.titleSm}>{summary.sectionTitle}</h2>
            <ul style={featureListStyles.list}>
              {summary.items.map((item) => (
                <li key={item} style={featureListStyles.item}>
                  <span style={featureListStyles.dot} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </PageContainer>
      </PageSection>

      {/* Bottom nav */}
      <div style={bottomNavStyles.wrap}>
        <PageContainer>
          <div style={bottomNavStyles.inner}>
            <Link to={bottomNav.prev.to} style={bottomNavStyles.muted}>{bottomNav.prev.label}</Link>
            <Link to={bottomNav.backHome.to} style={bottomNavStyles.muted}>{bottomNav.backHome.label}</Link>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

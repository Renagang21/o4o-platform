/**
 * GuideIntroOperationPage — 운영 구조 (공통)
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 */

import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';
import type { GuideIntroOperationPageProps } from './types.js';
import {
  heroStyles,
  sectionStyles,
  cardStyles,
  flowStyles,
  featureListStyles,
  bottomNavStyles,
} from './styles.js';

export function GuideIntroOperationPage({
  hero,
  operator,
  store,
  community,
  flow,
  features,
  bottomNav,
}: GuideIntroOperationPageProps) {
  const groups = [operator, store, community];

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

      {/* Sections 1-3: operator/store/community card grids */}
      {groups.map((g) => (
        <PageSection key={g.sectionTitle}>
          <PageContainer>
            <div style={sectionStyles.wrap}>
              <h2 style={sectionStyles.titleSm}>{g.sectionTitle}</h2>
              <div style={cardStyles.grid}>
                {g.cards.map((card) => (
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

      {/* Section 4: Flow */}
      <PageSection>
        <PageContainer>
          <div style={sectionStyles.wrap}>
            <h2 style={sectionStyles.titleSm}>{flow.sectionTitle}</h2>
            <div style={flowStyles.mainFlow}>
              {flow.mainFlow.map((node, idx, arr) => (
                <div key={node} style={flowStyles.mainFlowStep}>
                  <span style={flowStyles.mainFlowNode}>{node}</span>
                  {idx < arr.length - 1 && <span style={flowStyles.mainFlowArrow}>→</span>}
                </div>
              ))}
            </div>
            <div style={flowStyles.cycleRow}>
              {flow.cycle.map((step, idx, arr) => (
                <div key={step} style={flowStyles.mainFlowStep}>
                  <span style={flowStyles.cycleNode}>{step}</span>
                  {idx < arr.length - 1 && <span style={flowStyles.cycleArrow}>→</span>}
                </div>
              ))}
            </div>
            <div style={flowStyles.subFlowList}>
              {flow.subFlow.map((row) => (
                <div key={row.from} style={flowStyles.subFlowRow}>
                  <span style={flowStyles.subFlowNode}>{row.from}</span>
                  <span style={flowStyles.subFlowArrow}>→</span>
                  {row.mid && (
                    <>
                      <span style={flowStyles.subFlowNode}>{row.mid}</span>
                      <span style={flowStyles.subFlowArrow}>→</span>
                    </>
                  )}
                  <span style={flowStyles.subFlowNode}>{row.to}</span>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* Section 5: Features */}
      <PageSection last>
        <PageContainer>
          <div style={sectionStyles.wrap}>
            <h2 style={sectionStyles.titleSm}>{features.sectionTitle}</h2>
            <ul style={featureListStyles.list}>
              {features.items.map((f) => (
                <li key={f} style={featureListStyles.item}>
                  <span style={featureListStyles.dot} />
                  {f}
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
            <Link to={bottomNav.next.to} style={bottomNavStyles.primary}>{bottomNav.next.label}</Link>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

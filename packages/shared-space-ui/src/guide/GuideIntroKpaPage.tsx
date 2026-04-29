/**
 * GuideIntroKpaPage — 서비스 위치 (공통)
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 *
 * Route name `/guide/intro/kpa` is preserved per WO; copy/title varies per service.
 * Future cleanup candidate: rename route to neutral form (e.g. `/guide/intro/service`)
 * since GlycoPharm and any future service also reaches this page.
 */

import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';
import type { GuideIntroKpaPageProps } from './types.js';
import {
  heroStyles,
  sectionStyles,
  cardStyles,
  flowStyles,
  featureListStyles,
  bottomNavStyles,
} from './styles.js';

export function GuideIntroKpaPage({
  hero,
  community,
  network,
  storeConnection,
  roleSummary,
  bottomNav,
  renderText,
}: GuideIntroKpaPageProps) {
  return (
    <div>
      {/* Hero */}
      <div style={heroStyles.hero}>
        <div style={heroStyles.heroInner}>
          <p style={heroStyles.eyebrow}>{hero.eyebrow}</p>
          <h1 style={heroStyles.title}>{hero.title}</h1>
          <p style={heroStyles.descCompact}>
            {renderText ? renderText('hero-desc', hero.description) : hero.description}
          </p>
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

      {/* Section 1: Community */}
      <PageSection>
        <PageContainer>
          <div style={sectionStyles.wrap}>
            <h2 style={sectionStyles.titleSm}>{community.sectionTitle}</h2>
            <div style={cardStyles.grid}>
              {community.cards.map((card) => (
                <div key={card.label} style={cardStyles.overview}>
                  <p style={cardStyles.overviewLabel}>{card.label}</p>
                  <p style={cardStyles.overviewSummary}>{card.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* Section 2: Network */}
      <PageSection>
        <PageContainer>
          <div style={sectionStyles.wrap}>
            <h2 style={sectionStyles.titleSm}>{network.sectionTitle}</h2>
            <div style={cardStyles.grid}>
              {network.cards.map((card) => (
                <div key={card.label} style={cardStyles.overview}>
                  <p style={cardStyles.overviewLabel}>{card.label}</p>
                  <p style={cardStyles.overviewSummary}>{card.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* Section 3: Store connection */}
      <PageSection>
        <PageContainer>
          <div style={sectionStyles.wrap}>
            <h2 style={sectionStyles.titleSm}>{storeConnection.sectionTitle}</h2>
            <div style={flowStyles.transitionRow}>
              <span style={flowStyles.transitionBefore}>{storeConnection.transitionBefore}</span>
              <span style={flowStyles.transitionArrow}>→</span>
              <span style={flowStyles.transitionAfter}>{storeConnection.transitionAfter}</span>
            </div>
            <div style={flowStyles.mainFlow}>
              {storeConnection.mainFlow.map((node, idx, arr) => (
                <div key={node} style={flowStyles.mainFlowStep}>
                  <span style={flowStyles.mainFlowNode}>{node}</span>
                  {idx < arr.length - 1 && <span style={flowStyles.mainFlowArrow}>→</span>}
                </div>
              ))}
            </div>
            <div style={flowStyles.subFlowList}>
              {storeConnection.subFlow.map((row) => (
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

      {/* Section 4: Role summary */}
      <PageSection last>
        <PageContainer>
          <div style={sectionStyles.wrap}>
            <h2 style={sectionStyles.titleSm}>{roleSummary.sectionTitle}</h2>
            <ul style={featureListStyles.list}>
              {roleSummary.items.map((item) => (
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
            <Link to={bottomNav.next.to} style={bottomNavStyles.primary}>{bottomNav.next.label}</Link>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

/**
 * GuideIntroStructurePage — O4O 기본 구조 (공통)
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 */

import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';
import type { GuideIntroStructurePageProps } from './types.js';
import {
  heroStyles,
  sectionStyles,
  cardStyles,
  flowStyles,
  featureListStyles,
  bottomNavStyles,
} from './styles.js';

export function GuideIntroStructurePage({
  hero,
  overview,
  roleDetail,
  relations,
  features,
  bottomNav,
  renderText,
}: GuideIntroStructurePageProps) {
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

      {/* Section 1: Overview */}
      <PageSection>
        <PageContainer>
          <div style={sectionStyles.wrap}>
            <h2 style={sectionStyles.titleSm}>{overview.sectionTitle}</h2>
            <div style={cardStyles.grid}>
              {overview.cards.map((card) => (
                <div key={card.label} style={cardStyles.overview}>
                  <p style={cardStyles.overviewLabel}>{card.label}</p>
                  <p style={cardStyles.overviewSummary}>{card.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* Section 2: Role detail */}
      <PageSection>
        <PageContainer>
          <div style={sectionStyles.wrap}>
            <h2 style={sectionStyles.titleSm}>{roleDetail.sectionTitle}</h2>
            <div style={cardStyles.grid}>
              {roleDetail.roles.map((role) => (
                <div key={role.label} style={cardStyles.role}>
                  <p style={cardStyles.roleLabel}>{role.label}</p>
                  <ul style={cardStyles.taskList}>
                    {role.tasks.map((task) => (
                      <li key={task} style={cardStyles.taskItem}>
                        <span style={cardStyles.taskDot} />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* Section 3: Relations */}
      <PageSection>
        <PageContainer>
          <div style={sectionStyles.wrap}>
            <h2 style={sectionStyles.titleSm}>{relations.sectionTitle}</h2>
            <div style={flowStyles.transitionRow}>
              <span style={flowStyles.transitionBefore}>{relations.transitionBefore}</span>
              <span style={flowStyles.transitionArrow}>→</span>
              <span style={flowStyles.transitionAfter}>{relations.transitionAfter}</span>
            </div>
            <div style={flowStyles.mainFlow}>
              {relations.mainFlow.map((node, idx, arr) => (
                <div key={node} style={flowStyles.mainFlowStep}>
                  <span style={flowStyles.mainFlowNode}>{node}</span>
                  {idx < arr.length - 1 && <span style={flowStyles.mainFlowArrow}>→</span>}
                </div>
              ))}
            </div>
            <div style={flowStyles.subFlowList}>
              {relations.subFlow.map((row) => (
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

      {/* Section 4: Features */}
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

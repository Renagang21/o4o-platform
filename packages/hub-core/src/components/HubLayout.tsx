/**
 * HubLayout — 허브 전체 레이아웃 (헤더 + 섹션 + 푸터)
 *
 * WO-PLATFORM-HUB-CORE-EXTRACTION-V1
 * WO-PLATFORM-HUB-AI-SIGNAL-INTEGRATION-V1
 *
 * 사용법:
 *   <HubLayout
 *     title="운영 허브"
 *     subtitle="서비스 운영 현황을 한눈에 확인하세요"
 *     sections={sections}
 *     userRoles={['admin']}
 *     signals={{ members: { level: 'warning', label: '승인 대기', count: 3 } }}
 *     onCardClick={(href) => navigate(href)}
 *   />
 */

import { useEffect } from 'react';
import type { HubLayoutProps } from '../types.js';
import { filterSectionsByRole } from '../role-filter.js';
import { HubSection } from './HubSection.js';

// Pulse 애니메이션 CSS를 한 번만 주입
let styleInjected = false;
function injectSignalStyles() {
  if (styleInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes hub-signal-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  `;
  document.head.appendChild(style);
  styleInjected = true;
}

export function HubLayout({
  title,
  subtitle,
  sections,
  userRoles,
  onCardClick,
  onActionTrigger,
  signals,
  beforeSections,
  afterSections,
  footerNote,
}: HubLayoutProps) {
  useEffect(() => {
    if (signals) injectSignalStyles();
  }, [signals]);

  const visibleSections = filterSectionsByRole(sections, userRoles);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>{title}</h1>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>

      {/* Before Sections (서비스별 커스텀 영역) */}
      {beforeSections}

      {/* Sections */}
      {visibleSections.map((section) => (
        <HubSection
          key={section.id}
          title={section.title}
          badge={section.badge}
          cards={section.cards}
          signals={signals}
          onCardClick={onCardClick}
          onActionTrigger={onActionTrigger}
        />
      ))}

      {/* After Sections */}
      {afterSections}

      {/* Footer */}
      {footerNote && (
        <p style={styles.footerNote}>{footerNote}</p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 6px 0',
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  },
  footerNote: {
    marginTop: '16px',
    fontSize: '0.75rem',
    color: '#94a3b8',
    textAlign: 'center' as const,
  },
};

/**
 * GuideIntroStructurePage — O4O 기본 구조
 *
 * WO-KPA-GUIDE-INTRO-SUBPAGES-V1
 */

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';

const ITEMS = [
  {
    label: '공급자',
    role: '생산',
    detail:
      '상품과 콘텐츠를 만들고 플랫폼에 등록합니다. 공급자가 등록한 항목은 매장에서 선택해 취급할 수 있습니다.',
    examples: ['약품·건강기능식품 공급사', '교육 콘텐츠 제작자', '디지털 자산 제공자'],
  },
  {
    label: '운영자',
    role: '구성',
    detail:
      '플랫폼 정책과 승인 흐름을 설정합니다. 공급자와 매장 사이의 규칙을 정하고 커미션·품질 기준을 관리합니다.',
    examples: ['서비스 정책 설정', '공급자·매장 승인 관리', '커미션·정산 규칙 설정'],
  },
  {
    label: '매장',
    role: '실행',
    detail:
      '공급자의 상품과 콘텐츠를 취급하며 고객에게 직접 전달합니다. 약국은 KPA-Society에서 매장 역할을 담당합니다.',
    examples: ['상품 취급 및 고객 판매', '콘텐츠 활용 및 홍보', '고객 응대 및 서비스'],
  },
];

export function GuideIntroStructurePage() {
  return (
    <div>
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <p style={styles.heroEyebrow}>O4O 개요</p>
          <h1 style={styles.heroTitle}>O4O 기본 구조</h1>
          <p style={styles.heroDesc}>
            공급자 → 운영자 → 매장, 세 주체가 하나의 플랫폼 위에서 역할을 나눕니다.
          </p>
        </div>
      </div>

      <PageSection>
        <PageContainer>
          <div style={styles.flowRow}>
            {ITEMS.map((item, idx) => (
              <div key={item.label} style={styles.flowStep}>
                <span style={styles.flowRole}>{item.role}</span>
                <span style={styles.flowLabel}>{item.label}</span>
                {idx < ITEMS.length - 1 && <span style={styles.flowArrow}>→</span>}
              </div>
            ))}
          </div>
        </PageContainer>
      </PageSection>

      {ITEMS.map((item, idx) => (
        <PageSection key={item.label} last={idx === ITEMS.length - 1}>
          <PageContainer>
            <div style={styles.block}>
              <div style={styles.blockHeader}>
                <span style={styles.blockBadge}>{item.role}</span>
                <h2 style={styles.blockTitle}>{item.label}</h2>
              </div>
              <p style={styles.blockDesc}>{item.detail}</p>
              <ul style={styles.list}>
                {item.examples.map((ex) => (
                  <li key={ex} style={styles.listItem}>
                    <span style={styles.listDot} />
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          </PageContainer>
        </PageSection>
      ))}

      <div style={styles.bottomNav}>
        <PageContainer>
          <div style={styles.bottomNavInner}>
            <Link to="/guide/intro" style={styles.navMuted}>← O4O 개요</Link>
            <Link to="/guide/intro/kpa" style={styles.navPrimary}>KPA-Society 위치 →</Link>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  hero: { backgroundColor: '#1e293b', padding: '48px 0 40px' },
  heroInner: { maxWidth: 720, margin: '0 auto', padding: '0 24px' },
  heroEyebrow: {
    fontSize: '0.8125rem', fontWeight: 500, color: '#94a3b8',
    margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  heroTitle: { fontSize: '1.875rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 12px 0', lineHeight: 1.25 },
  heroDesc: { fontSize: '1rem', color: '#94a3b8', lineHeight: 1.7, margin: 0 },
  flowRow: {
    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    padding: '16px 0', marginBottom: 8,
  },
  flowStep: { display: 'flex', alignItems: 'center', gap: 8 },
  flowRole: {
    fontSize: '0.75rem', fontWeight: 600, color: '#2563eb',
    backgroundColor: '#eff6ff', borderRadius: 4, padding: '2px 8px',
  },
  flowLabel: { fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' },
  flowArrow: { fontSize: '1rem', color: '#94a3b8', marginLeft: 4 },
  block: { paddingTop: 4, paddingBottom: 4 },
  blockHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  blockBadge: {
    fontSize: '0.75rem', fontWeight: 600, color: '#2563eb',
    backgroundColor: '#eff6ff', borderRadius: 4, padding: '2px 8px',
  },
  blockTitle: { fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 },
  blockDesc: { fontSize: '0.9375rem', color: '#475569', lineHeight: 1.7, margin: '0 0 14px 0', maxWidth: 600 },
  list: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 },
  listItem: { display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9375rem', color: '#334155' },
  listDot: { width: 6, height: 6, borderRadius: '50%', backgroundColor: '#2563eb', flexShrink: 0 },
  bottomNav: { borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '20px 0' },
  bottomNavInner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  navPrimary: { fontSize: '0.875rem', fontWeight: 600, color: '#2563eb', textDecoration: 'none' },
  navMuted: { fontSize: '0.875rem', color: '#64748b', textDecoration: 'none' },
};

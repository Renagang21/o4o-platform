/**
 * GuideIntroOperationPage — 운영 구조
 *
 * WO-KPA-GUIDE-INTRO-SUBPAGES-V1
 */

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';

const STEPS = [
  {
    step: '1단계',
    label: '운영자 중심 구조',
    detail:
      '운영자는 플랫폼 전체의 규칙을 설정합니다. 공급자 심사, 매장 승인, 커미션 정책, 콘텐츠 품질 기준이 여기서 결정됩니다. 운영자의 결정이 플랫폼 전체에 영향을 줍니다.',
    items: ['공급자·매장 승인 및 자격 관리', '커미션·정산 정책 설정', '콘텐츠 품질 기준 및 모더레이션'],
  },
  {
    step: '2단계',
    label: '매장 실행 구조',
    detail:
      '매장(약국)은 운영자가 설정한 구조 안에서 실제 서비스를 운영합니다. 공급자의 상품을 취급하고 고객에게 전달하며, 매장 자체의 콘텐츠와 채널을 관리합니다.',
    items: ['공급자 카탈로그에서 상품 선택 및 취급', '사이니지·블로그 등 매장 채널 운영', '고객 주문 처리 및 서비스 제공'],
  },
  {
    step: '3단계',
    label: '커뮤니티 확장 구조',
    detail:
      '매장에서 쌓인 경험과 지식이 커뮤니티로 돌아옵니다. 포럼에서 공유된 사례가 다른 매장의 운영 개선으로 이어지며, 교육 콘텐츠가 다시 매장 경쟁력을 높입니다.',
    items: ['포럼에서 운영 노하우·임상 사례 공유', '교육을 통한 전문성 강화 및 이수 인증', '자료실 공동 자산이 네트워크 전체에 공유'],
  },
];

export function GuideIntroOperationPage() {
  return (
    <div>
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <p style={styles.heroEyebrow}>O4O 개요</p>
          <h1 style={styles.heroTitle}>운영 구조</h1>
          <p style={styles.heroDesc}>
            운영자 설정 → 매장 실행 → 커뮤니티 확장, 세 단계가 순환하며 플랫폼이 성장합니다.
          </p>
        </div>
      </div>

      {STEPS.map((step, idx) => (
        <PageSection key={step.label} last={idx === STEPS.length - 1}>
          <PageContainer>
            <div style={styles.block}>
              <div style={styles.blockHeader}>
                <span style={styles.stepBadge}>{step.step}</span>
                <h2 style={styles.blockTitle}>{step.label}</h2>
              </div>
              <p style={styles.blockDesc}>{step.detail}</p>
              <ul style={styles.list}>
                {step.items.map((it) => (
                  <li key={it} style={styles.listItem}>
                    <span style={styles.listDot} />
                    {it}
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
            <Link to="/guide/intro/kpa" style={styles.navMuted}>← KPA-Society 위치</Link>
            <Link to="/guide/intro/concept" style={styles.navPrimary}>핵심 개념 →</Link>
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
  block: { paddingTop: 4, paddingBottom: 4 },
  blockHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  stepBadge: {
    fontSize: '0.75rem', fontWeight: 700, color: '#2563eb',
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

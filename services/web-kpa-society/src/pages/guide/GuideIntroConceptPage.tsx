/**
 * GuideIntroConceptPage — 핵심 개념
 *
 * WO-KPA-GUIDE-INTRO-SUBPAGES-V1
 */

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';

const CONCEPTS = [
  {
    label: '소규모 사업자 연대',
    detail:
      '개별 약국 혼자서는 가질 수 없는 유통·콘텐츠·기술 인프라를 플랫폼이 공동으로 제공합니다. 작은 사업자가 대형 체인과 대등한 경쟁력을 갖출 수 있는 구조입니다.',
    points: [
      '공동 공급망 — 개별 계약 없이 플랫폼 공급자 카탈로그 이용 가능',
      '공동 콘텐츠 — Hub에서 제작된 콘텐츠를 모든 매장이 재사용',
      '공동 기술 — 사이니지·QR·블로그 등 디지털 도구를 개별 구축 없이 사용',
    ],
  },
  {
    label: '세미 프랜차이즈 구조',
    detail:
      '프랜차이즈처럼 브랜드나 상호를 통일하지 않아도, 운영 체계와 품질 기준을 공유합니다. 자율성을 유지하면서도 플랫폼 신뢰를 함께 쌓는 느슨한 연합 모델입니다.',
    points: [
      '각 약국은 독립 상호·운영 방식 유지',
      '플랫폼 품질 기준과 승인 절차는 공통 적용',
      '성과 데이터와 운영 사례는 네트워크 전체가 공유',
    ],
  },
  {
    label: '정보 기반 판매',
    detail:
      '약사의 전문 지식은 신뢰의 원천입니다. 이 지식이 콘텐츠(포스팅·강의·자료)로 전환되면 매장 신뢰도가 높아지고, 이는 고객 재방문과 매출로 이어집니다.',
    points: [
      '포럼·자료실 — 약사 지식을 공개 콘텐츠로 축적',
      'LMS — 강의와 이수 인증으로 전문성 가시화',
      '매장 블로그·사이니지 — 전문 콘텐츠가 고객 접점에 직접 노출',
    ],
  },
];

export function GuideIntroConceptPage() {
  return (
    <div>
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <p style={styles.heroEyebrow}>O4O 개요</p>
          <h1 style={styles.heroTitle}>핵심 개념</h1>
          <p style={styles.heroDesc}>
            O4O 플랫폼이 약사 네트워크에 적합한 이유, 세 가지 철학적 기반입니다.
          </p>
        </div>
      </div>

      {CONCEPTS.map((concept, idx) => (
        <PageSection key={concept.label} last={idx === CONCEPTS.length - 1}>
          <PageContainer>
            <div style={styles.block}>
              <h2 style={styles.blockTitle}>{concept.label}</h2>
              <p style={styles.blockDesc}>{concept.detail}</p>
              <ul style={styles.list}>
                {concept.points.map((pt) => (
                  <li key={pt} style={styles.listItem}>
                    <span style={styles.listDot} />
                    {pt}
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
            <Link to="/guide/intro/operation" style={styles.navMuted}>← 운영 구조</Link>
            <Link to="/guide/intro" style={styles.navMuted}>O4O 개요로 돌아가기</Link>
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
  blockTitle: { fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0' },
  blockDesc: { fontSize: '0.9375rem', color: '#475569', lineHeight: 1.7, margin: '0 0 14px 0', maxWidth: 600 },
  list: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 },
  listItem: { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.9375rem', color: '#334155', lineHeight: 1.6 },
  listDot: { width: 6, height: 6, borderRadius: '50%', backgroundColor: '#2563eb', flexShrink: 0, marginTop: 6 },
  bottomNav: { borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '20px 0' },
  bottomNavInner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  navPrimary: { fontSize: '0.875rem', fontWeight: 600, color: '#2563eb', textDecoration: 'none' },
  navMuted: { fontSize: '0.875rem', color: '#64748b', textDecoration: 'none' },
};

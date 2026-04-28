/**
 * GuideIntroOperationPage — 운영 구조
 *
 * WO-KPA-GUIDE-INTRO-SUBPAGES-V1 (최종 사용자 기준 버전)
 *
 * 핵심 메시지: 운영자는 구성하고, 매장은 실행하고, 커뮤니티는 확장한다
 */

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';

const OPERATOR_CARDS = [
  { label: '상품 구성',   summary: '상품 선택 · 구성' },
  { label: '콘텐츠 구성', summary: '자료 정리 · 콘텐츠 구성' },
  { label: '매장 지원',   summary: '진열 · 설명 · 운영 지원' },
];

const STORE_CARDS = [
  { label: '상품 선택', summary: '구성된 상품 선택' },
  { label: '매장 진열', summary: '채널별 상품 진열' },
  { label: '고객 대응', summary: '상담 · 설명 · 판매' },
];

const COMMUNITY_CARDS = [
  { label: '정보 공유', summary: '질문 · 답변 · 사례' },
  { label: '경험 축적', summary: '사용 경험 · 적용 사례' },
  { label: '확산 구조', summary: '정보 → 공유 → 확산' },
];

const FLOW_ROWS = [
  { from: '상품',   mid: '구성', to: '판매' },
  { from: '콘텐츠', mid: '정리', to: '활용' },
  { from: '경험',   mid: '공유', to: '확산' },
];

const FEATURES = [
  '운영자 중심 구조',
  '매장 실행 부담 분리',
  '커뮤니티 기반 확장',
  '실행과 관리 분리 구조',
];

export function GuideIntroOperationPage() {
  return (
    <div>
      {/* ── Hero ── */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <p style={styles.heroEyebrow}>O4O 개요</p>
          <h1 style={styles.heroTitle}>운영 구조</h1>
          <p style={styles.heroDesc}>운영자 · 매장 · 커뮤니티 흐름</p>

          <div style={styles.heroContext}>
            <div style={styles.heroContextRow}>
              <span style={styles.heroContextLabel}>운영자</span>
              <span style={styles.heroContextValue}>구성 · 지원 · 실행 분리</span>
            </div>
            <div style={styles.heroContextRow}>
              <span style={styles.heroContextLabel}>매장</span>
              <span style={styles.heroContextValue}>선택 · 활용 · 판매</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 1: 운영자 ── */}
      <PageSection>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>운영자 — 무엇을 준비하는가</h2>
            <div style={styles.cardGrid}>
              {OPERATOR_CARDS.map((card) => (
                <div key={card.label} style={styles.overviewCard}>
                  <p style={styles.overviewLabel}>{card.label}</p>
                  <p style={styles.overviewSummary}>{card.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* ── Section 2: 매장 ── */}
      <PageSection>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>매장 — 무엇을 실행하는가</h2>
            <div style={styles.cardGrid}>
              {STORE_CARDS.map((card) => (
                <div key={card.label} style={styles.overviewCard}>
                  <p style={styles.overviewLabel}>{card.label}</p>
                  <p style={styles.overviewSummary}>{card.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* ── Section 3: 커뮤니티 ── */}
      <PageSection>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>커뮤니티 — 무엇이 축적되는가</h2>
            <div style={styles.cardGrid}>
              {COMMUNITY_CARDS.map((card) => (
                <div key={card.label} style={styles.overviewCard}>
                  <p style={styles.overviewLabel}>{card.label}</p>
                  <p style={styles.overviewSummary}>{card.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* ── Section 4: 흐름 ── */}
      <PageSection>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>흐름</h2>

            {/* 기본 흐름 */}
            <div style={styles.mainFlow}>
              {['운영자', '매장', '커뮤니티'].map((node, idx, arr) => (
                <div key={node} style={styles.mainFlowStep}>
                  <span style={styles.mainFlowNode}>{node}</span>
                  {idx < arr.length - 1 && <span style={styles.mainFlowArrow}>→</span>}
                </div>
              ))}
            </div>

            {/* 순환 구조 */}
            <div style={styles.cycleRow}>
              {['구성', '실행', '공유'].map((step, idx, arr) => (
                <div key={step} style={styles.mainFlowStep}>
                  <span style={styles.cycleNode}>{step}</span>
                  {idx < arr.length - 1 && <span style={styles.cycleArrow}>→</span>}
                </div>
              ))}
            </div>

            {/* 보조 흐름 */}
            <div style={styles.subFlowList}>
              {FLOW_ROWS.map((row) => (
                <div key={row.from} style={styles.subFlowRow}>
                  <span style={styles.subFlowNode}>{row.from}</span>
                  <span style={styles.subFlowArrow}>→</span>
                  <span style={styles.subFlowNode}>{row.mid}</span>
                  <span style={styles.subFlowArrow}>→</span>
                  <span style={styles.subFlowNode}>{row.to}</span>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* ── Section 5: 핵심 특징 ── */}
      <PageSection last>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>핵심 특징 — 왜 이 구조가 중요한가</h2>
            <ul style={styles.featureList}>
              {FEATURES.map((f) => (
                <li key={f} style={styles.featureItem}>
                  <span style={styles.featureDot} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </PageContainer>
      </PageSection>

      {/* ── Bottom Nav ── */}
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
  heroTitle: {
    fontSize: '1.875rem', fontWeight: 700, color: '#f8fafc',
    margin: '0 0 8px 0', lineHeight: 1.25,
  },
  heroDesc: { fontSize: '1.0625rem', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: 1.6 },
  heroContext: {
    display: 'flex', flexDirection: 'column', gap: 8,
    borderLeft: '2px solid #3b82f6', paddingLeft: 14,
  },
  heroContextRow: { display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' },
  heroContextLabel: {
    fontSize: '0.75rem', fontWeight: 600, color: '#60a5fa',
    backgroundColor: 'rgba(96,165,250,0.12)', borderRadius: 4,
    padding: '2px 8px', flexShrink: 0, whiteSpace: 'nowrap',
  },
  heroContextValue: { fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.6 },

  sectionWrap: { paddingTop: 4, paddingBottom: 4 },
  sectionTitle: {
    fontSize: '0.8125rem', fontWeight: 700, color: '#94a3b8',
    margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.08em',
  },

  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  overviewCard: {
    backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: 8, padding: '18px 20px',
  },
  overviewLabel: { fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' },
  overviewSummary: { fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, margin: 0 },

  mainFlow: {
    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    backgroundColor: '#eff6ff', borderRadius: 10,
    padding: '18px 24px', marginBottom: 12,
  },
  mainFlowStep: { display: 'flex', alignItems: 'center', gap: 12 },
  mainFlowNode: { fontSize: '1.0625rem', fontWeight: 700, color: '#1d4ed8' },
  mainFlowArrow: { fontSize: '1.125rem', color: '#60a5fa' },

  cycleRow: {
    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    marginBottom: 14,
  },
  cycleNode: {
    fontSize: '0.875rem', fontWeight: 600, color: '#1d4ed8',
    backgroundColor: '#eff6ff', borderRadius: 6, padding: '4px 12px',
  },
  cycleArrow: { fontSize: '0.9375rem', color: '#60a5fa' },

  subFlowList: { display: 'flex', flexDirection: 'column', gap: 8 },
  subFlowRow: { display: 'flex', alignItems: 'center', gap: 8 },
  subFlowNode: {
    fontSize: '0.8125rem', color: '#475569',
    backgroundColor: '#f1f5f9', borderRadius: 4, padding: '3px 10px',
  },
  subFlowArrow: { fontSize: '0.8125rem', color: '#94a3b8' },

  featureList: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 },
  featureItem: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    fontSize: '0.9375rem', color: '#334155', lineHeight: 1.6,
  },
  featureDot: {
    width: 6, height: 6, borderRadius: '50%',
    backgroundColor: '#2563eb', flexShrink: 0, marginTop: 6,
  },

  bottomNav: { borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '20px 0' },
  bottomNavInner: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', flexWrap: 'wrap', gap: 12,
  },
  navPrimary: { fontSize: '0.875rem', fontWeight: 600, color: '#2563eb', textDecoration: 'none' },
  navMuted: { fontSize: '0.875rem', color: '#64748b', textDecoration: 'none' },
};

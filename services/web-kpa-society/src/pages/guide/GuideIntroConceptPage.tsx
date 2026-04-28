/**
 * GuideIntroConceptPage — 핵심 개념
 *
 * WO-KPA-GUIDE-INTRO-SUBPAGES-V1 (최종 사용자 기준 버전)
 *
 * 핵심 메시지: 연대 구조와 정보 활용을 기반으로 소규모 사업자의 실행을 가능하게 하는 구조
 */

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';

const SOLIDARITY_CARDS = [
  { label: '소규모 사업자', summary: '개별 운영 구조 · 분산된 경쟁' },
  { label: '연결 구조',     summary: '개별 → 연결 · 분산 → 협력' },
  { label: '연대 효과',     summary: '공동 대응 · 정보 공유 · 실행 확대' },
];

const STRUCTURE_CARDS = [
  { label: '세미 프랜차이즈', summary: '중앙 통제 없음 · 자율 기반 구조' },
  { label: '운영자 역할',     summary: '구성 · 지원 · 연결' },
  { label: '매장 역할',       summary: '선택 · 실행 · 판매' },
];

const INFO_CARDS = [
  { label: '정보 기반 판매', summary: '설명 중심 · 콘텐츠 활용' },
  { label: '자료 활용',     summary: 'Raw 데이터 · 즉시 활용 구조' },
  { label: 'AI 활용',       summary: '해석 · 생성 · 적용' },
];

const COMPETITION_ROWS = [
  { label: '기존 구조', items: ['개별 경쟁', '정보 부족', '실행 한계'], dim: true },
  { label: 'O4O 구조',  items: ['연대 기반', '정보 활용', '실행 지원'], dim: false },
];

const SUMMARY_ITEMS = [
  '연대 기반 구조',
  '운영자 중심 구성',
  '정보 기반 판매',
  '소규모 사업자 경쟁력 구조',
];

export function GuideIntroConceptPage() {
  return (
    <div>
      {/* ── Hero ── */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <p style={styles.heroEyebrow}>O4O 개요</p>
          <h1 style={styles.heroTitle}>핵심 개념</h1>
          <p style={styles.heroDesc}>연대 · 구조 · 정보 기반 판매</p>

          <div style={styles.heroContext}>
            <div style={styles.heroContextRow}>
              <span style={styles.heroContextLabel}>문제</span>
              <span style={styles.heroContextValue}>소규모 사업자 환경 — 개별 운영 한계</span>
            </div>
            <div style={styles.heroContextRow}>
              <span style={styles.heroContextLabel}>방향</span>
              <span style={styles.heroContextValue}>연대 기반 구조 — 연결 · 협력 · 실행</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 1: 연대 ── */}
      <PageSection>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>연대 — 왜 필요한가</h2>
            <div style={styles.cardGrid}>
              {SOLIDARITY_CARDS.map((card) => (
                <div key={card.label} style={styles.overviewCard}>
                  <p style={styles.overviewLabel}>{card.label}</p>
                  <p style={styles.overviewSummary}>{card.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* ── Section 2: 구조 ── */}
      <PageSection>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>구조 — 어떻게 구성되는가</h2>
            <div style={styles.cardGrid}>
              {STRUCTURE_CARDS.map((card) => (
                <div key={card.label} style={styles.overviewCard}>
                  <p style={styles.overviewLabel}>{card.label}</p>
                  <p style={styles.overviewSummary}>{card.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* ── Section 3: 정보 ── */}
      <PageSection>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>정보 — 무엇이 경쟁력이 되는가</h2>
            <div style={styles.cardGrid}>
              {INFO_CARDS.map((card) => (
                <div key={card.label} style={styles.overviewCard}>
                  <p style={styles.overviewLabel}>{card.label}</p>
                  <p style={styles.overviewSummary}>{card.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* ── Section 4: 경쟁력 ── */}
      <PageSection>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>경쟁력 — 무엇이 달라지는가</h2>
            <div style={styles.compareGrid}>
              {COMPETITION_ROWS.map((row) => (
                <div key={row.label} style={row.dim ? styles.compareCardDim : styles.compareCardActive}>
                  <p style={row.dim ? styles.compareLabelDim : styles.compareLabelActive}>{row.label}</p>
                  <ul style={styles.compareList}>
                    {row.items.map((item) => (
                      <li key={item} style={styles.compareItem}>
                        <span style={row.dim ? styles.compareDotDim : styles.compareDotActive} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div style={styles.resultRow}>
              <span style={styles.resultDot} />
              <span style={styles.resultText}>소규모 경쟁력 확보 · 매장 실행 강화</span>
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* ── Section 5: 핵심 정리 ── */}
      <PageSection last>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>핵심 정리</h2>
            <ul style={styles.featureList}>
              {SUMMARY_ITEMS.map((item) => (
                <li key={item} style={styles.featureItem}>
                  <span style={styles.featureDot} />
                  {item}
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

  compareGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 },
  compareCardDim: {
    backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: 8, padding: '18px 20px', opacity: 0.7,
  },
  compareCardActive: {
    backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
    borderRadius: 8, padding: '18px 20px',
  },
  compareLabelDim: { fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', margin: '0 0 10px 0' },
  compareLabelActive: { fontSize: '0.875rem', fontWeight: 700, color: '#1d4ed8', margin: '0 0 10px 0' },
  compareList: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 },
  compareItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: '#334155' },
  compareDotDim: { width: 5, height: 5, borderRadius: '50%', backgroundColor: '#cbd5e1', flexShrink: 0 },
  compareDotActive: { width: 5, height: 5, borderRadius: '50%', backgroundColor: '#2563eb', flexShrink: 0 },
  resultRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 16px', backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0', borderRadius: 8,
  },
  resultDot: { width: 8, height: 8, borderRadius: '50%', backgroundColor: '#16a34a', flexShrink: 0 },
  resultText: { fontSize: '0.9375rem', fontWeight: 600, color: '#15803d' },

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

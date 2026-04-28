/**
 * GuideIntroKpaPage — KPA-Society 위치
 *
 * WO-KPA-GUIDE-INTRO-SUBPAGES-V1 (최종 사용자 기준 버전)
 *
 * 핵심 메시지: KPA-Society = 단순 커뮤니티가 아니라 매장과 연결되는 구조
 */

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';

const COMMUNITY_CARDS = [
  { label: '포럼',   summary: '질문 · 답변 · 경험 공유' },
  { label: '강의',   summary: '지식 전달 · 학습' },
  { label: '콘텐츠', summary: '자료 축적 · 활용 기반' },
];

const NETWORK_CARDS = [
  { label: '약사 네트워크', summary: '전문 직군 기반 연결' },
  { label: '정보 흐름',     summary: '경험 → 공유 → 확산' },
  { label: '신뢰 구조',     summary: '전문성 기반 신뢰' },
];

const STORE_FLOW_ROWS = [
  { from: '정보',   to: '적용' },
  { from: '콘텐츠', to: '설명' },
  { from: '경험',   to: '판매' },
];

const ROLE_ITEMS = [
  '정보 축적 구조',
  '매장 실행 연결 구조',
  '커뮤니티 확장 기반',
  '전문가 기반 정보 네트워크',
];

export function GuideIntroKpaPage() {
  return (
    <div>
      {/* ── Hero ── */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <p style={styles.heroEyebrow}>O4O 개요</p>
          <h1 style={styles.heroTitle}>KPA-Society 위치</h1>
          <p style={styles.heroDesc}>커뮤니티 · 네트워크 · 매장 연결</p>

          <div style={styles.heroContext}>
            <div style={styles.heroContextRow}>
              <span style={styles.heroContextLabel}>커뮤니티</span>
              <span style={styles.heroContextValue}>약사 중심 — 정보 · 경험 · 콘텐츠 축적</span>
            </div>
            <div style={styles.heroContextRow}>
              <span style={styles.heroContextLabel}>연결 구조</span>
              <span style={styles.heroContextValue}>정보 기반 매장 실행</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 1: 커뮤니티 ── */}
      <PageSection>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>커뮤니티 — 무엇이 쌓이는가</h2>
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

      {/* ── Section 2: 네트워크 ── */}
      <PageSection>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>네트워크 — 왜 다른 커뮤니티와 다른가</h2>
            <div style={styles.cardGrid}>
              {NETWORK_CARDS.map((card) => (
                <div key={card.label} style={styles.overviewCard}>
                  <p style={styles.overviewLabel}>{card.label}</p>
                  <p style={styles.overviewSummary}>{card.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* ── Section 3: 매장 연결 ── */}
      <PageSection>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>매장 연결 — 커뮤니티가 매장에 연결되는 구조</h2>

            {/* 핵심 전환 */}
            <div style={styles.transitionRow}>
              <span style={styles.transitionBefore}>단순 커뮤니티</span>
              <span style={styles.transitionArrow}>→</span>
              <span style={styles.transitionAfter}>매장 실행 연결 구조</span>
            </div>

            {/* 주요 흐름 */}
            <div style={styles.mainFlow}>
              <span style={styles.mainFlowNode}>커뮤니티</span>
              <span style={styles.mainFlowArrow}>→</span>
              <span style={styles.mainFlowNode}>매장</span>
            </div>

            {/* 활용 흐름 */}
            <div style={styles.subFlowList}>
              {STORE_FLOW_ROWS.map((row) => (
                <div key={row.from} style={styles.subFlowRow}>
                  <span style={styles.subFlowNode}>{row.from}</span>
                  <span style={styles.subFlowArrow}>→</span>
                  <span style={styles.subFlowNode}>{row.to}</span>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* ── Section 4: 역할 정리 ── */}
      <PageSection last>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>역할 정리</h2>
            <ul style={styles.featureList}>
              {ROLE_ITEMS.map((item) => (
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
            <Link to="/guide/intro/structure" style={styles.navMuted}>← O4O 기본 구조</Link>
            <Link to="/guide/intro/operation" style={styles.navPrimary}>운영 구조 →</Link>
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

  transitionRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    marginBottom: 16, flexWrap: 'wrap',
  },
  transitionBefore: {
    fontSize: '0.875rem', color: '#94a3b8',
    backgroundColor: '#f1f5f9', borderRadius: 6, padding: '5px 12px',
  },
  transitionArrow: { fontSize: '1rem', color: '#60a5fa', fontWeight: 600 },
  transitionAfter: {
    fontSize: '0.875rem', fontWeight: 600, color: '#1d4ed8',
    backgroundColor: '#eff6ff', borderRadius: 6, padding: '5px 12px',
  },

  mainFlow: {
    display: 'flex', alignItems: 'center', gap: 12,
    backgroundColor: '#eff6ff', borderRadius: 10,
    padding: '18px 24px', marginBottom: 14,
  },
  mainFlowNode: { fontSize: '1.0625rem', fontWeight: 700, color: '#1d4ed8' },
  mainFlowArrow: { fontSize: '1.125rem', color: '#60a5fa' },

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

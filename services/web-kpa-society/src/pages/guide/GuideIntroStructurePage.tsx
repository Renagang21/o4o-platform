/**
 * GuideIntroStructurePage — O4O 기본 구조
 *
 * WO-KPA-GUIDE-INTRO-SUBPAGES-V1 (최종 사용자 기준 버전)
 */

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';

const OVERVIEW_CARDS = [
  { label: '공급자', summary: '상품 · 가격 · 콘텐츠' },
  { label: '운영자', summary: '구성 · 관리 · 배포' },
  { label: '매장',   summary: '진열 · 상담 · 판매' },
];

const ROLE_DETAIL = [
  { label: '공급자', tasks: ['상품 공급', '가격 조건', '콘텐츠 제공'] },
  { label: '운영자', tasks: ['상품 구성', '콘텐츠 구성', '매장 지원'] },
  { label: '매장',   tasks: ['상품 선택', '고객 응대', '판매 실행'] },
];

const FLOW_ROWS = [
  { from: '상품',   mid: '구성', to: '판매' },
  { from: '콘텐츠', mid: '정리', to: '활용' },
  { from: '정보',   mid: '전달', to: '실행' },
];

const FEATURES = [
  '운영자 중심 구조',
  '매장 실행 부담 분리',
  '콘텐츠 기반 판매 구조',
  '매장 직접 운영 부담 최소화',
];

export function GuideIntroStructurePage() {
  return (
    <div>
      {/* ── Hero ── */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <p style={styles.heroEyebrow}>O4O 개요</p>
          <h1 style={styles.heroTitle}>O4O 기본 구조</h1>
          <p style={styles.heroDesc}>공급자 · 운영자 · 매장 구조</p>

          {/* 문제 + 구조 맥락 */}
          <div style={styles.heroContext}>
            <div style={styles.heroContextRow}>
              <span style={styles.heroContextLabel}>해결 대상</span>
              <span style={styles.heroContextValue}>소규모 매장의 운영 부담 — 상품, 콘텐츠, 고객 대응</span>
            </div>
            <div style={styles.heroContextRow}>
              <span style={styles.heroContextLabel}>구조 방식</span>
              <span style={styles.heroContextValue}>운영자 중심 구조 · 구성 · 지원 · 실행 분리</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 1: 구조 개요 ── */}
      <PageSection>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>구조 개요</h2>
            <div style={styles.cardGrid}>
              {OVERVIEW_CARDS.map((card) => (
                <div key={card.label} style={styles.overviewCard}>
                  <p style={styles.overviewLabel}>{card.label}</p>
                  <p style={styles.overviewSummary}>{card.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* ── Section 2: 역할 상세 ── */}
      <PageSection>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>역할 상세</h2>
            <div style={styles.roleGrid}>
              {ROLE_DETAIL.map((role) => (
                <div key={role.label} style={styles.roleCard}>
                  <p style={styles.roleLabel}>{role.label}</p>
                  <ul style={styles.taskList}>
                    {role.tasks.map((task) => (
                      <li key={task} style={styles.taskItem}>
                        <span style={styles.taskDot} />
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

      {/* ── Section 3: 관계 구조 ── */}
      <PageSection>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>관계 구조</h2>

            {/* 전환 개념 */}
            <div style={styles.transitionRow}>
              <span style={styles.transitionBefore}>개별 매장 직접 운영 구조</span>
              <span style={styles.transitionArrow}>→</span>
              <span style={styles.transitionAfter}>운영자 기반 구조</span>
            </div>

            {/* 주요 흐름 */}
            <div style={styles.mainFlow}>
              {['공급자', '운영자', '매장'].map((node, idx, arr) => (
                <div key={node} style={styles.mainFlowStep}>
                  <span style={styles.mainFlowNode}>{node}</span>
                  {idx < arr.length - 1 && <span style={styles.mainFlowArrow}>→</span>}
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

      {/* ── Section 4: 핵심 특징 ── */}
      <PageSection last>
        <PageContainer>
          <div style={styles.sectionWrap}>
            <h2 style={styles.sectionTitle}>핵심 특징</h2>
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
            <Link to="/guide/intro" style={styles.navMuted}>← O4O 개요</Link>
            <Link to="/guide/intro/kpa" style={styles.navPrimary}>KPA-Society 위치 →</Link>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  // Hero
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

  // Section common
  sectionWrap: { paddingTop: 4, paddingBottom: 4 },
  sectionTitle: {
    fontSize: '0.8125rem', fontWeight: 700, color: '#94a3b8',
    margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.08em',
  },

  // Section 1
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  overviewCard: {
    backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: 8, padding: '18px 20px',
  },
  overviewLabel: { fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' },
  overviewSummary: { fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, margin: 0 },

  // Section 2
  roleGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  roleCard: {
    backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
    borderRadius: 8, padding: '18px 20px',
  },
  roleLabel: { fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b', margin: '0 0 12px 0' },
  taskList: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 },
  taskItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: '#334155' },
  taskDot: { width: 5, height: 5, borderRadius: '50%', backgroundColor: '#2563eb', flexShrink: 0 },

  // Section 3
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
    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    backgroundColor: '#eff6ff', borderRadius: 10,
    padding: '18px 24px', marginBottom: 14,
  },
  mainFlowStep: { display: 'flex', alignItems: 'center', gap: 12 },
  mainFlowNode: { fontSize: '1.0625rem', fontWeight: 700, color: '#1d4ed8' },
  mainFlowArrow: { fontSize: '1.125rem', color: '#60a5fa' },
  subFlowList: { display: 'flex', flexDirection: 'column', gap: 8 },
  subFlowRow: { display: 'flex', alignItems: 'center', gap: 8 },
  subFlowNode: {
    fontSize: '0.8125rem', color: '#475569',
    backgroundColor: '#f1f5f9', borderRadius: 4, padding: '3px 10px',
  },
  subFlowArrow: { fontSize: '0.8125rem', color: '#94a3b8' },

  // Section 4
  featureList: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 },
  featureItem: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    fontSize: '0.9375rem', color: '#334155', lineHeight: 1.6,
  },
  featureDot: {
    width: 6, height: 6, borderRadius: '50%',
    backgroundColor: '#2563eb', flexShrink: 0, marginTop: 6,
  },

  // Bottom nav
  bottomNav: { borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '20px 0' },
  bottomNavInner: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', flexWrap: 'wrap', gap: 12,
  },
  navPrimary: { fontSize: '0.875rem', fontWeight: 600, color: '#2563eb', textDecoration: 'none' },
  navMuted: { fontSize: '0.875rem', color: '#64748b', textDecoration: 'none' },
};

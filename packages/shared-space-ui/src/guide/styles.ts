/**
 * Guide Styles — shared across all 7 guide pages
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 *
 * 기존 KPA Guide 7개 페이지에서 동일했던 스타일을 한 곳에 모았다.
 * 페이지별로 약간 다른 hero padding은 컴포넌트 내부 override로 처리.
 */

import type { CSSProperties } from 'react';

// ─── Hero ─────────────────────────────────────────────────────────────────

export const heroStyles: Record<string, CSSProperties> = {
  hero: { backgroundColor: '#1e293b', padding: '48px 0 40px' },
  heroLg: { backgroundColor: '#1e293b', padding: '56px 0 48px' },
  heroInner: { maxWidth: 720, margin: '0 auto', padding: '0 24px' },
  eyebrow: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#94a3b8',
    margin: '0 0 10px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: 700,
    color: '#f8fafc',
    margin: '0 0 8px 0',
    lineHeight: 1.25,
  },
  titleLg: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#f8fafc',
    margin: '0 0 14px 0',
    lineHeight: 1.25,
  },
  desc: {
    fontSize: '1rem',
    color: '#94a3b8',
    lineHeight: 1.7,
    margin: '0 0 24px 0',
  },
  descCompact: {
    fontSize: '1.0625rem',
    color: '#94a3b8',
    margin: '0 0 20px 0',
    lineHeight: 1.6,
  },
  context: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    borderLeft: '2px solid #3b82f6',
    paddingLeft: 14,
  },
  contextRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  contextLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#60a5fa',
    backgroundColor: 'rgba(96,165,250,0.12)',
    borderRadius: 4,
    padding: '2px 8px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  contextValue: { fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.6 },
  flowBarTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  flowBar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: 0,
  },
  flowBarItem: { display: 'flex', alignItems: 'center', gap: 4 },
  flowBarLabel: { fontSize: '0.8125rem', fontWeight: 500, color: '#cbd5e1' },
  flowBarArrow: { fontSize: '0.75rem', color: '#475569' },
  heroNav: { marginTop: 8 },
  heroNavLink: {
    fontSize: '0.875rem',
    color: '#60a5fa',
    textDecoration: 'none',
    fontWeight: 500,
  },
};

// ─── Section ──────────────────────────────────────────────────────────────

export const sectionStyles: Record<string, CSSProperties> = {
  wrap: { paddingTop: 4, paddingBottom: 4 },
  wrapLg: { paddingTop: 8, paddingBottom: 8 },
  titleSm: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#94a3b8',
    margin: '0 0 16px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  // /guide/intro 형 large header
  headerLg: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  numberBadge: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    padding: '2px 7px',
    letterSpacing: '0.04em',
    flexShrink: 0,
  },
  titleLink: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' },
  titleLg: { fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 },
  arrow: { fontSize: '0.9375rem', fontWeight: 600, color: '#2563eb' },
  routeBadge: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: '2px 8px',
    fontFamily: 'monospace',
  },
  desc: {
    fontSize: '0.9375rem',
    color: '#475569',
    lineHeight: 1.7,
    margin: '0 0 20px 0',
    maxWidth: 640,
  },
};

// ─── Cards ────────────────────────────────────────────────────────────────

export const cardStyles: Record<string, CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 12,
  },
  gridLg: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 12,
  },
  gridFeature: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
  },
  overview: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '18px 20px',
  },
  overviewLabel: { fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' },
  overviewSummary: { fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, margin: 0 },
  // /guide/intro 형 (smaller label, longer detail)
  basic: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '16px 18px',
  },
  basicLabel: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 6px 0',
  },
  basicDetail: { fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.6, margin: 0 },
  // /guide/features의 클릭 가능 카드
  link: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '16px 18px',
    textDecoration: 'none',
    display: 'block',
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
    cursor: 'pointer',
  },
  linkLabel: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 6px 0',
  },
  linkRoute: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    margin: 0,
    fontFamily: 'monospace',
  },
  // role card (tasks list)
  role: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '18px 20px',
  },
  roleLabel: { fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b', margin: '0 0 12px 0' },
  taskList: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 },
  taskItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: '#334155' },
  taskDot: { width: 5, height: 5, borderRadius: '50%', backgroundColor: '#2563eb', flexShrink: 0 },
};

// ─── Flow blocks ──────────────────────────────────────────────────────────

export const flowStyles: Record<string, CSSProperties> = {
  transitionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  transitionBefore: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    padding: '5px 12px',
  },
  transitionArrow: { fontSize: '1rem', color: '#60a5fa', fontWeight: 600 },
  transitionAfter: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#1d4ed8',
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    padding: '5px 12px',
  },
  mainFlow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: '18px 24px',
    marginBottom: 14,
  },
  mainFlowStep: { display: 'flex', alignItems: 'center', gap: 12 },
  mainFlowNode: { fontSize: '1.0625rem', fontWeight: 700, color: '#1d4ed8' },
  mainFlowArrow: { fontSize: '1.125rem', color: '#60a5fa' },
  cycleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  cycleNode: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#1d4ed8',
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    padding: '4px 12px',
  },
  cycleArrow: { fontSize: '0.9375rem', color: '#60a5fa' },
  subFlowList: { display: 'flex', flexDirection: 'column', gap: 8 },
  subFlowRow: { display: 'flex', alignItems: 'center', gap: 8 },
  subFlowNode: {
    fontSize: '0.8125rem',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    padding: '3px 10px',
  },
  subFlowArrow: { fontSize: '0.8125rem', color: '#94a3b8' },
};

// ─── Feature lists ────────────────────────────────────────────────────────

export const featureListStyles: Record<string, CSSProperties> = {
  list: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    fontSize: '0.9375rem',
    color: '#334155',
    lineHeight: 1.6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    flexShrink: 0,
    marginTop: 6,
  },
};

// ─── Compare grid (concept page) ──────────────────────────────────────────

export const compareStyles: Record<string, CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  cardDim: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '18px 20px',
    opacity: 0.7,
  },
  cardActive: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    padding: '18px 20px',
  },
  labelDim: { fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', margin: '0 0 10px 0' },
  labelActive: { fontSize: '0.875rem', fontWeight: 700, color: '#1d4ed8', margin: '0 0 10px 0' },
  list: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 },
  item: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: '#334155' },
  dotDim: { width: 5, height: 5, borderRadius: '50%', backgroundColor: '#cbd5e1', flexShrink: 0 },
  dotActive: { width: 5, height: 5, borderRadius: '50%', backgroundColor: '#2563eb', flexShrink: 0 },
  resultRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
  },
  resultDot: { width: 8, height: 8, borderRadius: '50%', backgroundColor: '#16a34a', flexShrink: 0 },
  resultText: { fontSize: '0.9375rem', fontWeight: 600, color: '#15803d' },
};

// ─── Bottom nav ───────────────────────────────────────────────────────────

export const bottomNavStyles: Record<string, CSSProperties> = {
  wrap: { borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '20px 0' },
  inner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  group: { display: 'flex', gap: 20, alignItems: 'center' },
  primary: { fontSize: '0.875rem', fontWeight: 600, color: '#2563eb', textDecoration: 'none' },
  muted: { fontSize: '0.875rem', color: '#64748b', textDecoration: 'none' },
};

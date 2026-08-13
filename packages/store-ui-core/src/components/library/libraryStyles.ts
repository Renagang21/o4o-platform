/**
 * 내 자료함 공통 스타일 — WO-O4O-MY-STORE-LIBRARY-RESOURCES-CONTENTS-KCOS-GP-COMMONIZATION-V1
 *
 * Resources / Contents 두 화면 × 두 서비스 = 4 벌로 복사돼 있던 style map 을 한 곳으로 모은다.
 * 렌더 값은 종전과 동일하다. 두 화면에서 달랐던 값(row justify / badge 색)만 분리해 둔다.
 */

import type { CSSProperties } from 'react';

export const libraryStyles: Record<string, CSSProperties> = {
  container: { padding: '24px', maxWidth: '900px', margin: '0 auto' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '6px',
  },
  title: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '20px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  subtitle: { fontSize: '13px', color: '#64748b', margin: '6px 0 0' },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#475569',
    cursor: 'pointer',
    flexShrink: 0,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    textAlign: 'center',
  },
  list: { display: 'flex', flexDirection: 'column', gap: '6px' },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
  },
  rowMain: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 },
  rowTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowMeta: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  descText: {
    fontSize: '12px',
    color: '#64748b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '300px',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    color: '#64748b',
    borderRadius: '4px',
    textDecoration: 'none',
    flexShrink: 0,
  },
  startBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#334155',
    cursor: 'pointer',
    fontWeight: 500,
    flexShrink: 0,
  },
};

/** 자료 행 badge — 중립(카테고리) */
export const libraryNeutralBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 6px',
  fontSize: '11px',
  fontWeight: 500,
  background: '#f1f5f9',
  color: '#475569',
  borderRadius: '4px',
};

/** 콘텐츠 행 badge — 출처(sourceService) */
export const libraryAccentBadgeStyle: CSSProperties = {
  ...libraryNeutralBadgeStyle,
  background: '#eff6ff',
  color: '#2563eb',
};

/** 콘텐츠 행은 좌우 정렬(제작 시작 버튼) */
export const libraryContentRowStyle: CSSProperties = {
  ...libraryStyles.row,
  justifyContent: 'space-between',
};

/** 콘텐츠 행 meta — 종전 동작 유지(줄바꿈 없음) */
export const libraryContentMetaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

export const libraryMetaDateStyle: CSSProperties = { color: '#94a3b8', fontSize: 12 };

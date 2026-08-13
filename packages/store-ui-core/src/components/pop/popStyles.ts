/**
 * POP Composer 공통 스타일 — WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1
 *
 * 두 서비스에 각각 복사돼 있던 인라인 style 상수를 한 곳으로 모은다.
 * accent 에 의존하는 값만 factory 로 만들고 나머지는 정적 상수로 둔다 — 렌더 값은 종전과 동일하다.
 */

import type { CSSProperties } from 'react';
import type { PopAccentTheme } from './types';

export const popPageStyle: CSSProperties = { maxWidth: 900, margin: '0 auto', padding: '0 0 80px' };

export const popSectionStyle: CSSProperties = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};

export const popSectionHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 16,
};

export const popBackBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 8px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  backgroundColor: '#fff',
  cursor: 'pointer',
  color: '#64748b',
};

export const popRefreshSmallBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 10px',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 12,
  color: '#64748b',
  backgroundColor: '#fff',
  cursor: 'pointer',
};

export const popRetryBtnStyle: CSSProperties = {
  padding: '6px 16px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
  color: '#475569',
  backgroundColor: '#fff',
  cursor: 'pointer',
};

/** 문구 저장 버튼 — 두 서비스 모두 accent 와 무관한 보라색이었다(그대로 유지). */
export const popSaveContentBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  backgroundColor: '#7c3aed',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

export const popAiPreviewStyle: CSSProperties = {
  marginTop: 12,
  padding: '12px 14px',
  backgroundColor: '#faf5ff',
  border: '1px solid #e9d5ff',
  borderRadius: 8,
};

export const popStepBadgeStyle = (accent: PopAccentTheme): CSSProperties => ({
  width: 24,
  height: 24,
  borderRadius: '50%',
  backgroundColor: accent.color,
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

export const popGenerateBtnStyle = (accent: PopAccentTheme): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 28px',
  backgroundColor: accent.color,
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 700,
});

/** 선택 가능한 카드(공급자 자료 / 레이아웃 / 템플릿)의 선택 상태 테두리·배경 */
export const popSelectableStyle = (accent: PopAccentTheme, selected: boolean): CSSProperties => ({
  border: `2px solid ${selected ? accent.color : '#e2e8f0'}`,
  backgroundColor: selected ? accent.softBg : '#fff',
});

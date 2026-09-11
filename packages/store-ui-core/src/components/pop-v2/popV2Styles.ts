/**
 * POP V2 화면 공통 스타일
 *
 * WO-O4O-STORE-POP-LEGACY-INSTANT-PDF-RETIREMENT-FINAL-CLOSURE-V1:
 *   legacy POP composer(`components/pop/popStyles.ts`) 제거에 따라 V2 가 쓰던 3개 스타일만 이관.
 */
import type { CSSProperties } from 'react';
import type { PopV2AccentTheme } from './types';

export const popPageStyle: CSSProperties = { maxWidth: 900, margin: '0 auto', padding: '0 0 80px' };

export const popSectionStyle: CSSProperties = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};

export const popStepBadgeStyle = (accent: PopV2AccentTheme): CSSProperties => ({
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

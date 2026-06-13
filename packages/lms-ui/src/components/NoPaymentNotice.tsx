import type { CSSProperties } from 'react';

export interface NoPaymentNoticeProps {
  /**
   * 유료 강의 안내 포함 여부. true 면 "수강료가 있는 강의의 납부·확인은 강사/운영자가
   * 별도 안내" 문장을 덧붙인다. (결제 버튼/checkout 연결은 없음.)
   */
  paid?: boolean;
  /** inline(테두리 박스) vs plain(텍스트만). 기본 inline. */
  variant?: 'inline' | 'plain';
  style?: CSSProperties;
}

const BASE_MESSAGE = 'O4O에서는 강의 결제를 제공하지 않습니다.';
const PAID_MESSAGE = '수강료가 있는 강의의 납부와 확인은 강사 또는 운영자가 별도로 안내합니다.';

const boxStyle: CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '12px 14px',
  fontSize: '13px',
  color: '#64748b',
  lineHeight: 1.6,
};

/**
 * "O4O 에서는 강의 결제를 제공하지 않습니다" 표준 안내.
 * 결제/checkout 버튼을 렌더하지 않는다(정책: 플랫폼 내 강의 결제 없음).
 */
export function NoPaymentNotice({ paid = false, variant = 'inline', style }: NoPaymentNoticeProps) {
  const text = paid ? `${PAID_MESSAGE} ${BASE_MESSAGE}` : BASE_MESSAGE;
  if (variant === 'plain') {
    return <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: 0, ...style }}>{text}</p>;
  }
  return <div style={{ ...boxStyle, ...style }}>{text}</div>;
}

import { useId } from 'react';

export interface EventOfferTerms {
  eventPrice: string;
  startAt: string;
  endAt: string;
}
export const EMPTY_EVENT_TERMS: EventOfferTerms = { eventPrice: '', startAt: '', endAt: '' };
export function eventOfferConditions(value: EventOfferTerms) {
  const eventPrice = Number(value.eventPrice);
  const start = new Date(value.startAt), end = new Date(value.endAt);
  if (!Number.isFinite(eventPrice) || eventPrice <= 0 || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) return null;
  return { eventPrice, startAt: start.toISOString(), endAt: end.toISOString() };
}

/** 기존 이벤트 추가/제안 화면의 가격·기간 입력만 공유한다. */
export function EventOfferTermsFields({ value, onChange, disabled }: Readonly<{
  value: EventOfferTerms;
  onChange: (value: EventOfferTerms) => void;
  disabled: boolean;
}>) {
  const id = useId();
  const fieldStyle = { width: '100%', minWidth: 0, padding: 8, border: '1px solid #CBD5E1', borderRadius: 6, boxSizing: 'border-box' as const };
  return <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
    <label htmlFor={`${id}-price`}>이벤트 가격 (원)<input id={`${id}-price`} type="number" min="1" required disabled={disabled} value={value.eventPrice} onChange={e => onChange({ ...value, eventPrice: e.target.value })} style={fieldStyle} /></label>
    <label htmlFor={`${id}-start`}>시작 일시 (현지 시각)<input id={`${id}-start`} type="datetime-local" required disabled={disabled} value={value.startAt} onChange={e => onChange({ ...value, startAt: e.target.value })} style={fieldStyle} /></label>
    <label htmlFor={`${id}-end`}>종료 일시 (현지 시각)<input id={`${id}-end`} type="datetime-local" required disabled={disabled} value={value.endAt} onChange={e => onChange({ ...value, endAt: e.target.value })} style={fieldStyle} /></label>
  </div>;
}

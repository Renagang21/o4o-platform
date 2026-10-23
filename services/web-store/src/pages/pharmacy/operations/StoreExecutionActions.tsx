import type { StoreExecutionGroup } from '@o4o/store-ui-core';
import { Link, useLocation } from 'react-router-dom';
import { storeOperationState, type StoreOperationEntry } from './storeOperationEntry';

const linkStyle = 'inline-flex min-h-11 items-center text-sm text-blue-700 underline';
export function StoreExecutionActions({ group, scope, base, tabletAllowed, qrAllowed }: Readonly<{
  group: StoreExecutionGroup; scope: string; base: string; tabletAllowed: boolean; qrAllowed: boolean;
}>) {
  const location = useLocation();
  const choices = (kind: StoreOperationEntry['kind'], targets: Array<{ id: string; label: string }>, label: string) => {
    if (!targets.length) return null;
    const path = kind === 'tablet' ? '/commerce/tablet-displays' : '/marketing/qr';
    const links = targets.map(target => <Link key={target.id} className={linkStyle}
      to={`${base}${path}?workspace=use`} state={storeOperationState(location, scope, kind, target.id)}>
      {targets.length === 1 ? label : target.label}
    </Link>);
    return targets.length === 1 ? links : <details><summary className="min-h-11 cursor-pointer content-center text-sm text-blue-700">{label} ({targets.length})</summary><nav aria-label={label} className="flex flex-col gap-1">{links}</nav></details>;
  };
  return <nav aria-label={`${group.label} 작업`} className="flex flex-wrap items-start gap-3">
    {tabletAllowed && choices('tablet', group.tablets.map(item => ({ id: item.id, label: item.name })), '이 위치의 화면 변경')}
    {qrAllowed && choices('qr', group.qrs.map(item => ({ id: item.id, label: item.title })), 'QR 배치·출력')}
  </nav>;
}

export function StoreOperationReturn({ entry }: Readonly<{ entry: StoreOperationEntry | null }>) {
  return entry ? <Link className={`${linkStyle} mb-3`} to={entry.returnPath} state={entry.returnState}>위치별 현황으로 돌아가기</Link> : null;
}

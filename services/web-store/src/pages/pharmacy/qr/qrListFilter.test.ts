import { describe, expect, it } from 'vitest';
import { filterQrList, qrListTabs } from './qrListFilter';

const rows = [
  { id: 'page', landingType: 'page' },
  { id: 'ai', landingType: 'page', aiDescriptionMode: 'single' },
  { id: 'link', landingType: 'link' },
  { id: 'corner-1', landingType: 'screen_set' },
  { id: 'corner-2', landingType: 'screen_set' },
];
const ids = (list: { id: string }[]) => list.map((row) => row.id);

describe('QR 목록 기본값 — 태블릿 코너 QR 분리 (WO-O4O-STORE-QR-TABLET-CHANNEL-SEPARATION-V1 D3)', () => {
  it('매장 QR shows only QR the store made; corner QR appear under 태블릿 코너', () => {
    expect(ids(filterQrList(rows, 'all'))).toEqual(['page', 'ai', 'link']);
    expect(ids(filterQrList(rows, 'screen_set'))).toEqual(['corner-1', 'corner-2']);
    expect(ids(filterQrList(rows, 'content'))).toEqual(['page']);
    expect(ids(filterQrList(rows, 'ai'))).toEqual(['ai']);
  });
  it('a QR opened from an operation entry is never hidden, even a corner QR', () => {
    expect(ids(filterQrList([rows[3]], 'all', true))).toEqual(['corner-1']);
  });
  it('tab counts split store QR and corner QR', () => {
    expect(qrListTabs(rows).map((tab) => [tab.label, tab.count])).toEqual([['매장 QR', 3], ['콘텐츠 연결', 1], ['AI 설명', 1], ['태블릿 코너', 2]]);
  });
});

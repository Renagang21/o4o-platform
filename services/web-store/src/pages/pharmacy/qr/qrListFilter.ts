/**
 * QR 목록 필터 — WO-O4O-STORE-QR-TABLET-CHANNEL-SEPARATION-V1 D3 · T3(2026-11-13).
 *
 * 태블릿 코너 QR(landingType='screen_set')은 화면 세트를 저장할 때 자동으로 생겨 목록을 덮었다(58건 중 38건).
 * 기본 목록 「매장 QR」은 매장이 직접 만든 QR 만 보이고, 코너 QR 은 「태블릿 코너」를 고를 때 보인다.
 * 데이터 · 출력 · 활성 건수 판정은 바꾸지 않는다. 업무 화면에서 특정 QR 을 열고 들어온 경우(focus)는 그 QR 을 숨기지 않는다.
 */
export type QrListFilter = 'all' | 'content' | 'ai' | 'screen_set';
type QrRow = { landingType?: string | null; aiDescriptionMode?: unknown };

const isCorner = (q: QrRow) => q.landingType === 'screen_set';

export function filterQrList<T extends QrRow>(items: T[], filter: QrListFilter, focused = false): T[] {
  return items.filter((q) => {
    if (filter === 'ai') return !!q.aiDescriptionMode;
    if (filter === 'content') return q.landingType === 'page' && !q.aiDescriptionMode;
    if (filter === 'screen_set') return isCorner(q);
    return focused || !isCorner(q);
  });
}

export function qrListTabs(items: QrRow[]): { key: QrListFilter; label: string; count: number }[] {
  const corner = items.filter(isCorner).length;
  return [
    { key: 'all', label: '매장 QR', count: items.length - corner },
    { key: 'content', label: '콘텐츠 연결', count: items.filter((q) => q.landingType === 'page' && !q.aiDescriptionMode).length },
    { key: 'ai', label: 'AI 설명', count: items.filter((q) => !!q.aiDescriptionMode).length },
    { key: 'screen_set', label: '태블릿 코너', count: corner },
  ];
}

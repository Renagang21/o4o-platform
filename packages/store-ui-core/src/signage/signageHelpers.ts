/**
 * signageHelpers — 매장 사이니지 화면 공통 로직 (순수 함수)
 *
 * WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1 §5-B:
 *   KPA StoreSignagePage 등이 12개 helper 를
 *   본문까지 완전히 동일하게 복제하고 있었다(공백 제거 후 md5 일치 12/12).
 *   서비스별 entity 타입에 묶이지 않도록 구조적 타입으로만 받는다.
 *
 * ⚠️ 렌더 결과를 바꾸지 않는 순수 이관이다. 판정 기준(강제 노출 경고일수 등)을 여기서 바꾸지 말 것.
 */

/** 강제 노출 만료 임박 경고 기준(일) */
export const FORCED_WARN_DAYS = 7;

/** 강제 노출 판정에 필요한 최소 형태 */
export interface SignageForcedLike {
  isForced?: boolean;
  forcedStartAt?: string | null;
  forcedEndAt?: string | null;
}

/** KPI 집계에 필요한 최소 형태 */
export interface SignageAssetLike extends SignageForcedLike {
  publishStatus?: string;
  channelMap?: { signage?: unknown } | null;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

export function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function isForcedActive(item: SignageForcedLike): boolean {
  if (!item.isForced) return false;
  const now = new Date();
  if (item.forcedStartAt && new Date(item.forcedStartAt) > now) return false;
  if (item.forcedEndAt && new Date(item.forcedEndAt) < now) return false;
  return true;
}

export function isForcedExpiringSoon(item: SignageForcedLike): boolean {
  if (!item.isForced || !item.forcedEndAt) return false;
  const days = daysUntil(item.forcedEndAt);
  return days >= 0 && days <= FORCED_WARN_DAYS;
}

export function isForcedExpired(item: SignageForcedLike): boolean {
  if (!item.isForced || !item.forcedEndAt) return false;
  return new Date(item.forcedEndAt) < new Date();
}

export function computeSignageKpi(items: SignageAssetLike[]) {
  let published = 0;
  let draft = 0;
  let hidden = 0;
  let forcedActive = 0;
  let signageChannel = 0;

  for (const item of items) {
    if (item.publishStatus === 'published') published++;
    else if (item.publishStatus === 'draft') draft++;
    else if (item.publishStatus === 'hidden') hidden++;
    if (isForcedActive(item)) forcedActive++;
    if (item.publishStatus === 'published' && item.channelMap?.signage) signageChannel++;
  }

  return { published, draft, hidden, forcedActive, signageChannel };
}

/** 동영상 URL 의 외부 소스 판별 */
export function detectVideoSource(url: string): 'youtube' | 'vimeo' | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) return 'youtube';
    if (u.hostname.includes('vimeo.com')) return 'vimeo';
    return null;
  } catch {
    return null;
  }
}

/**
 * signageHelpers — 매장 사이니지 화면 공통 로직 (순수 함수)
 *
 * WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1 §5-B:
 *   KPA StoreSignagePage 와 GlycoPharm StoreSignageMainPage 가 12개 helper 를
 *   본문까지 완전히 동일하게 복제하고 있었다(공백 제거 후 md5 일치 12/12).
 *   서비스별 entity 타입에 묶이지 않도록 구조적 타입으로만 받는다.
 *
 * ⚠️ 렌더 결과를 바꾸지 않는 순수 이관이다. 판정 기준(강제 노출 경고일수 등)을 여기서 바꾸지 말 것.
 */

/** 강제 노출 만료 임박 경고 기준(일) */
export const FORCED_WARN_DAYS = 7;

/** 요일 라벨 (0=일) */
export const SIGNAGE_DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

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

/** 스케줄 활성 판정에 필요한 최소 형태 */
export interface SignageScheduleLike {
  id: string;
  isActive: boolean;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  validFrom?: string | null;
  validUntil?: string | null;
  priority: number;
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

/** HH:MM:SS → HH:MM 비교용 문자열 */
export function toHHMM(t: string): string {
  return t.slice(0, 5);
}

/** 현재 시간 기준으로 스케줄이 활성인지 판단 */
export function isScheduleNowActive(sch: SignageScheduleLike, now: Date): boolean {
  if (!sch.isActive) return false;
  const day = now.getDay();
  if (!sch.daysOfWeek.includes(day)) return false;
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (hhmm < toHHMM(sch.startTime) || hhmm >= toHHMM(sch.endTime)) return false;
  const today = now.toISOString().slice(0, 10);
  if (sch.validFrom && today < sch.validFrom) return false;
  if (sch.validUntil && today > sch.validUntil) return false;
  return true;
}

/** 현재 활성 스케줄 (priority 높은 순) */
export function getCurrentSchedule<T extends SignageScheduleLike>(schedules: T[]): T | null {
  const now = new Date();
  return schedules
    .filter((s) => isScheduleNowActive(s, now))
    .sort((a, b) => b.priority - a.priority)[0] ?? null;
}

/** 오늘 현재 이후 가장 빠른 예정 스케줄 */
export function getNextSchedule<T extends SignageScheduleLike>(
  schedules: T[],
  currentId: string | null,
): T | null {
  const now = new Date();
  const day = now.getDay();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return schedules
    .filter((s) => {
      if (!s.isActive || s.id === currentId) return false;
      if (!s.daysOfWeek.includes(day)) return false;
      return toHHMM(s.startTime) > hhmm;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0] ?? null;
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

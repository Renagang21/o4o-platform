/**
 * Forum Owner Area — accent 기본값
 *
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1
 *
 * 서비스가 theme 을 주지 않아도 화면이 성립하도록 중립(slate) 기본값을 둔다.
 * 브랜드색은 각 서비스 adapter 파일이 완전한 Tailwind 클래스 문자열로 주입한다.
 */

import type { ForumOwnerTheme } from './types.js';

export const DEFAULT_FORUM_OWNER_THEME: ForumOwnerTheme = {
  accentText: 'text-slate-600',
  accentSolid: 'bg-slate-700 hover:bg-slate-800',
  accentSoft: 'bg-slate-50 border-slate-200 hover:bg-slate-100',
  accentSoftText: 'text-slate-600',
  accentStrongText: 'text-slate-800',
  accentBadge: 'bg-slate-100 text-slate-700',
  accentIconBg: 'bg-slate-50',
  accentRing: 'focus:ring-slate-400',
  accentHover: 'hover:text-slate-700 hover:bg-slate-50',
};

export function resolveForumOwnerTheme(theme?: Partial<ForumOwnerTheme>): ForumOwnerTheme {
  return theme ? { ...DEFAULT_FORUM_OWNER_THEME, ...theme } : DEFAULT_FORUM_OWNER_THEME;
}

/** ko-KR 날짜 표기 — 소유자 영역 공통 */
export function formatOwnerDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/** 짧은 날짜 표기 (회원 목록) */
export function formatOwnerDateShort(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('ko-KR');
  } catch {
    return dateString;
  }
}

/** adapter 가 throw 한 값에서 사용자에게 보일 메시지를 뽑는다. */
export function ownerErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}

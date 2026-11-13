/**
 * Raw SQL 페이지 창(LIMIT/OFFSET) 정규화 — 값은 문자열로 넣지 않고 binding 한다(CLAUDE.md §7 Guard Rule 2).
 *
 * 요청 값(page · limit)은 숫자 변환 후에도 `Infinity`(예: page=1e400) · `NaN` · 소수 · 0 이하가 될 수 있고,
 * 그대로 SQL 에 들어가면 Postgres 오류(500)가 된다. 여기서 유한 정수로 맞춘 뒤
 * `LIMIT $${params.length + 1} OFFSET $${params.length + 2}` 와 `[...params, limit, offset]` 로 binding 한다.
 */

/** 1 이상 정수로 맞춘다 — 유한하지 않거나 1 미만이면 fallback, max 초과는 max */
export function toPositiveInt(value: unknown, fallback: number, max: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export interface PageWindow {
  page: number;
  limit: number;
  offset: number;
}

/** page/limit → 정규화된 { page, limit, offset } */
export function pageWindow(
  page: unknown,
  limit: unknown,
  options: { defaultLimit: number; maxLimit: number; maxPage?: number },
): PageWindow {
  const safeLimit = toPositiveInt(limit, options.defaultLimit, options.maxLimit);
  const safePage = toPositiveInt(page, 1, options.maxPage ?? 1_000_000);
  return { page: safePage, limit: safeLimit, offset: (safePage - 1) * safeLimit };
}

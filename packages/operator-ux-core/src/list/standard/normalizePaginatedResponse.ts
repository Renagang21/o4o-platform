/**
 * normalizePaginatedResponse — 응답 shape 혼재 흡수 어댑터
 *
 * WO-O4O-STANDARD-LIST-CORE-V1
 *
 * 내부 감사 IR(IR-O4O-STANDARD-TABLE-LIST-PAGINATION-SORTING-AUDIT-V1)에서 확인된
 * 4종+ 응답 형태를 표준 StandardPaginatedResponse 로 변환한다.
 *
 * 지원:
 *  - { success, data, pagination }
 *  - { data, pagination }
 *  - { data: { items, pagination } }
 *  - { data, meta: { total, page, limit } }
 *  - { <domainKey>, pagination }   (예: { applications, pagination }, { pharmacies, pagination }, { users, pagination })
 *  - { items, meta }
 *  - array-only  → total=data.length, page=1, limit=data.length fallback
 *
 * 안전: 인식 실패/throw 시 빈 배열 + 안전 pagination 으로 fallback (화면 crash 방지).
 */

import type { StandardPaginatedResponse, StandardPaginationState } from './standard-types';

interface RawPaginationLike {
  total?: unknown;
  page?: unknown;
  limit?: unknown;
}

function toPositiveInt(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n as number) : undefined;
}

function toNonNegInt(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n as number) : undefined;
}

function build<T>(
  data: T[],
  raw: RawPaginationLike,
  fallback?: { page?: number; limit?: number },
): StandardPaginatedResponse<T> {
  const limit =
    toPositiveInt(raw.limit) ??
    (fallback?.limit && fallback.limit > 0 ? fallback.limit : undefined) ??
    (data.length > 0 ? data.length : 20);
  const total = toNonNegInt(raw.total) ?? data.length;
  const page = toPositiveInt(raw.page) ?? fallback?.page ?? 1;
  const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
  const pagination: StandardPaginationState = {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
  return { data, pagination };
}

export function normalizePaginatedResponse<T>(
  response: unknown,
  fallback?: { page?: number; limit?: number },
): StandardPaginatedResponse<T> {
  try {
    if (Array.isArray(response)) {
      return build<T>(response as T[], {}, fallback);
    }
    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;

      // 1) data 배열 직접
      let data: T[] | undefined;
      let pagSource: RawPaginationLike | undefined;

      if (Array.isArray(r.data)) {
        data = r.data as T[];
      } else if (r.data && typeof r.data === 'object') {
        // { data: { items|data, pagination|meta } }
        const inner = r.data as Record<string, unknown>;
        if (Array.isArray(inner.items)) data = inner.items as T[];
        else if (Array.isArray(inner.data)) data = inner.data as T[];
        if (inner.pagination && typeof inner.pagination === 'object') pagSource = inner.pagination as RawPaginationLike;
        else if (inner.meta && typeof inner.meta === 'object') pagSource = inner.meta as RawPaginationLike;
      }

      // 2) items 배열
      if (!data && Array.isArray(r.items)) data = r.items as T[];

      // 3) domain key (첫 번째 배열 property — applications/users/pharmacies 등)
      if (!data) {
        const key = Object.keys(r).find(
          (k) => Array.isArray(r[k]) && k !== 'errors' && k !== 'warnings',
        );
        if (key) data = r[key] as T[];
      }

      // pagination 소스 (top-level)
      if (!pagSource) {
        if (r.pagination && typeof r.pagination === 'object') pagSource = r.pagination as RawPaginationLike;
        else if (r.meta && typeof r.meta === 'object') pagSource = r.meta as RawPaginationLike;
      }

      if (data) {
        return build<T>(data, pagSource ?? {}, fallback);
      }
    }
  } catch {
    /* fallthrough to safe empty */
  }
  return build<T>([], {}, fallback);
}

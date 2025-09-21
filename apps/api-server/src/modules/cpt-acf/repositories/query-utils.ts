import type { SelectQueryBuilder } from 'typeorm';

export interface Paging {
  limit: number;
  offset: number;
}

export function normalizePaging(params?: { limit?: number; offset?: number; page?: number; per_page?: number }): Paging {
  if (!params) return { limit: 20, offset: 0 };
  if (typeof params.page !== 'undefined' || typeof params.per_page !== 'undefined') {
    const per = Number(params.per_page ?? 20);
    const page = Number(params.page ?? 1);
    return { limit: per, offset: (page - 1) * per };
  }
  return { limit: Number(params.limit ?? 20), offset: Number(params.offset ?? 0) };
}

export function applyPagination<T>(qb: SelectQueryBuilder<T>, paging: Paging) {
  qb.skip(paging.offset).take(paging.limit);
}

export function applySearch<T>(qb: SelectQueryBuilder<T>, clauses: string[], paramValue: string) {
  if (!paramValue) return;
  const where = `(${clauses.join(' OR ')})`;
  qb.andWhere(where, { q: `%${paramValue}%` });
}

export function toPage<T>(items: T[], total: number, paging: Paging) {
  return { items, total, limit: paging.limit, offset: paging.offset };
}


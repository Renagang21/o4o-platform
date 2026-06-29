/**
 * applySupplierListQuery — Unit Tests
 *
 * WO-O4O-NETURE-OPERATOR-SUPPLIER-APPROVAL-STANDARD-LIST-AND-MEMBER-IA-V1
 *
 * Operator 공급자 승인 표준 리스트의 검색/상태필터/정렬/페이지네이션/summary 순수 로직 검증.
 * DB 비의존(enriched 배열 입력) — getAllSuppliers() 결과 위에서 동작하는 순수 함수만 테스트한다.
 */

import { applySupplierListQuery, type SupplierListItemLike } from '../supplier.service.js';
import { SupplierStatus } from '../../entities/index.js';

type Row = SupplierListItemLike;

function row(over: Partial<Row>): Row {
  return {
    status: SupplierStatus.PENDING,
    name: '공급자',
    contactEmail: null,
    userEmail: null,
    businessNumber: null,
    representativeName: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...over,
  };
}

const sample: Row[] = [
  row({ name: '오메가팜', status: SupplierStatus.PENDING, contactEmail: 'omega@x.com', businessNumber: '111-11-11111', representativeName: '김대표', createdAt: new Date('2026-01-05') }),
  row({ name: '베타헬스', status: SupplierStatus.ACTIVE, contactEmail: 'beta@y.com', businessNumber: '222-22-22222', representativeName: '이대표', createdAt: new Date('2026-01-03') }),
  row({ name: '감마케어', status: SupplierStatus.PENDING, userEmail: 'gamma@z.com', businessNumber: '333-33-33333', representativeName: '박대표', createdAt: new Date('2026-01-01') }),
  row({ name: '델타메디', status: SupplierStatus.REJECTED, contactEmail: 'delta@w.com', createdAt: new Date('2026-01-07') }),
  row({ name: '엡실론', status: SupplierStatus.INACTIVE, createdAt: new Date('2026-01-02') }),
];

describe('applySupplierListQuery', () => {
  describe('defaults & bounds', () => {
    it('defaults to page=1, limit=20', () => {
      const r = applySupplierListQuery(sample);
      expect(r.pagination.page).toBe(1);
      expect(r.pagination.limit).toBe(20);
    });

    it('caps limit at 100 and floors at 1', () => {
      expect(applySupplierListQuery(sample, { limit: 999 }).pagination.limit).toBe(100);
      expect(applySupplierListQuery(sample, { limit: 0 }).pagination.limit).toBe(1);
      expect(applySupplierListQuery(sample, { limit: -5 }).pagination.limit).toBe(1);
    });

    it('floors page at 1', () => {
      expect(applySupplierListQuery(sample, { page: 0 }).pagination.page).toBe(1);
      expect(applySupplierListQuery(sample, { page: -3 }).pagination.page).toBe(1);
    });
  });

  describe('status filter', () => {
    it('filters by status', () => {
      const r = applySupplierListQuery(sample, { status: SupplierStatus.PENDING });
      expect(r.pagination.total).toBe(2);
      expect(r.items.every((s) => s.status === SupplierStatus.PENDING)).toBe(true);
    });

    it('returns all when no status given', () => {
      expect(applySupplierListQuery(sample).pagination.total).toBe(5);
    });
  });

  describe('search', () => {
    it('matches name (case-insensitive, trimmed)', () => {
      const r = applySupplierListQuery(sample, { search: '  오메가  ' });
      expect(r.items.map((s) => s.name)).toEqual(['오메가팜']);
    });

    it('matches contact email and account email', () => {
      expect(applySupplierListQuery(sample, { search: 'gamma@z.com' }).items.map((s) => s.name)).toEqual(['감마케어']);
      expect(applySupplierListQuery(sample, { search: 'BETA@Y.COM' }).items.map((s) => s.name)).toEqual(['베타헬스']);
    });

    it('matches business number and representative name', () => {
      expect(applySupplierListQuery(sample, { search: '333-33' }).items.map((s) => s.name)).toEqual(['감마케어']);
      expect(applySupplierListQuery(sample, { search: '이대표' }).items.map((s) => s.name)).toEqual(['베타헬스']);
    });

    it('combines search with status filter', () => {
      const r = applySupplierListQuery(sample, { search: '대표', status: SupplierStatus.PENDING });
      // '대표' matches 3 reps (omega/beta/gamma); status PENDING keeps omega + gamma
      expect(r.pagination.total).toBe(2);
      expect(r.items.map((s) => s.name).sort()).toEqual(['감마케어', '오메가팜']);
    });
  });

  describe('summary (search-based, status-filter-independent)', () => {
    it('counts every status over the searched set, ignoring status filter', () => {
      const r = applySupplierListQuery(sample, { status: SupplierStatus.PENDING });
      expect(r.summary).toEqual({ total: 5, pending: 2, active: 1, rejected: 1, inactive: 1 });
    });

    it('summary reflects search narrowing', () => {
      const r = applySupplierListQuery(sample, { search: '대표' });
      expect(r.summary.total).toBe(3);
      expect(r.summary.pending).toBe(2);
      expect(r.summary.active).toBe(1);
    });
  });

  describe('sort', () => {
    it('sorts by createdAt desc by default', () => {
      const r = applySupplierListQuery(sample);
      expect(r.items.map((s) => s.name)).toEqual(['델타메디', '오메가팜', '베타헬스', '엡실론', '감마케어']);
    });

    it('sorts by createdAt asc', () => {
      const r = applySupplierListQuery(sample, { sortBy: 'createdAt', sortOrder: 'asc' });
      expect(r.items[0].name).toBe('감마케어');
      expect(r.items[r.items.length - 1].name).toBe('델타메디');
    });

    it('sorts by name asc/desc', () => {
      const asc = applySupplierListQuery(sample, { sortBy: 'name', sortOrder: 'asc' }).items.map((s) => s.name);
      const desc = applySupplierListQuery(sample, { sortBy: 'name', sortOrder: 'desc' }).items.map((s) => s.name);
      expect(desc).toEqual([...asc].reverse());
    });

    it('sorts by status', () => {
      const r = applySupplierListQuery(sample, { sortBy: 'status', sortOrder: 'asc' });
      // ACTIVE < INACTIVE < PENDING < REJECTED (alphabetical)
      expect(r.items[0].status).toBe(SupplierStatus.ACTIVE);
    });
  });

  describe('pagination math', () => {
    it('paginates and computes flags', () => {
      const p1 = applySupplierListQuery(sample, { page: 1, limit: 2, sortBy: 'createdAt', sortOrder: 'asc' });
      expect(p1.items).toHaveLength(2);
      expect(p1.pagination).toMatchObject({ page: 1, limit: 2, total: 5, totalPages: 3, hasNextPage: true, hasPreviousPage: false });

      const p3 = applySupplierListQuery(sample, { page: 3, limit: 2 });
      expect(p3.items).toHaveLength(1);
      expect(p3.pagination).toMatchObject({ page: 3, totalPages: 3, hasNextPage: false, hasPreviousPage: true });
    });

    it('handles empty result', () => {
      const r = applySupplierListQuery([], {});
      expect(r.items).toEqual([]);
      expect(r.pagination).toMatchObject({ total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
      expect(r.summary).toEqual({ total: 0, pending: 0, active: 0, rejected: 0, inactive: 0 });
    });

    it('does not mutate the input array order', () => {
      const input = [...sample];
      applySupplierListQuery(input, { sortBy: 'name', sortOrder: 'asc' });
      expect(input.map((s) => s.name)).toEqual(sample.map((s) => s.name));
    });
  });
});

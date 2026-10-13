import { describe, expect, it } from 'vitest';
import { buildServiceApprovalListParams, getSelectedPendingServiceApprovalIds } from '../productServiceApprovalModel';
import type { ServiceApprovalFilters } from '../productServiceApprovalModel';
import type { ServiceApprovalItem } from '../../../lib/api/serviceApproval';

function filters(overrides: Partial<ServiceApprovalFilters> = {}): ServiceApprovalFilters {
  return { statusFilter: 'all', serviceFilter: '', searchQuery: '', dateFrom: '', dateTo: '', scoreRange: '', filterHasIssues: false, priorityFilter: '', ...overrides };
}
const item = (id: string, approvalStatus: string, offerId = `offer-${id}`) => ({ id, approvalStatus, offerId } as ServiceApprovalItem);

describe('Neture product service approval read model', () => {
  it('retains unfiltered page size and undefined optional fields', () => {
    expect(buildServiceApprovalListParams(filters())).toEqual({ status: undefined, serviceKey: undefined, search: undefined, dateFrom: undefined, dateTo: undefined, page: 1, limit: 30, hasIssues: undefined, priority: undefined });
  });

  it.each([
    ['low', { minScore: 0, maxScore: 59 }], ['mid', { minScore: 60, maxScore: 79 }], ['high', { minScore: 80 }], ['', {}],
  ] as const)('keeps exact score boundaries for %s', (scoreRange, expected) => {
    const params = buildServiceApprovalListParams(filters({ scoreRange }));
    const { minScore, maxScore, ...rest } = params;
    expect(Object.fromEntries(Object.entries({ minScore, maxScore }).filter(([, v]) => v !== undefined))).toEqual(expected);
    expect(rest.page).toBe(1);
    if (scoreRange === '' || scoreRange === 'high') expect(Object.prototype.hasOwnProperty.call(params, 'maxScore')).toBe(false);
  });

  it.each(['pending', 'approved', 'rejected'])('forwards selected status %s', statusFilter => {
    expect(buildServiceApprovalListParams(filters({ statusFilter })).status).toBe(statusFilter);
  });

  it('preserves all filter values, page, and input objects without trimming', () => {
    const source = filters({ statusFilter: 'pending', serviceFilter: 'kpa-society', searchQuery: ' 상품 ', dateFrom: '2026-01-01', dateTo: '2026-10-13', scoreRange: 'mid', filterHasIssues: true, priorityFilter: 'HIGH' });
    const before = { ...source };
    expect(buildServiceApprovalListParams(source, 3)).toEqual({ status: 'pending', serviceKey: 'kpa-society', search: ' 상품 ', dateFrom: '2026-01-01', dateTo: '2026-10-13', page: 3, limit: 30, minScore: 60, maxScore: 79, hasIssues: 'true', priority: 'HIGH' });
    expect(source).toEqual(before);
  });

  it('returns approval ids in selection order, excluding absent and nonpending records', () => {
    const items = [item('a', 'pending'), item('b', 'approved'), item('c', 'rejected'), item('d', 'pending')];
    const selection = new Set(['d', 'missing', 'b', 'a', 'c']);
    expect(getSelectedPendingServiceApprovalIds(items, selection)).toEqual(['d', 'a']);
    expect([...selection]).toEqual(['d', 'missing', 'b', 'a', 'c']);
    expect(items.map(i => i.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('does not treat an offer id or another case of pending as an approval target', () => {
    expect(getSelectedPendingServiceApprovalIds([item('a', 'pending', 'shared-offer'), item('b', 'PENDING')], new Set(['shared-offer', 'b']))).toEqual([]);
  });

  it('preserves first matching id semantics and empty selection', () => {
    const rows = [item('a', 'approved'), item('a', 'pending')];
    expect(getSelectedPendingServiceApprovalIds(rows, new Set(['a']))).toEqual([]);
    expect(getSelectedPendingServiceApprovalIds(rows, new Set())).toEqual([]);
  });
});

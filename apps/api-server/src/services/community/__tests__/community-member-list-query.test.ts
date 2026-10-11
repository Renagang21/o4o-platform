import { parseCommunityMemberListQuery, CommunityMemberListQueryError } from '../community-member-list-query.js';
import { CommunityLifecycleService } from '../community-lifecycle.service.js';
import { CommunityOperatorDesignationService } from '../community-operator-designation.service.js';

const statuses = ['active', 'pending', 'suspended', 'rejected', 'withdrawn'];
it.each([{ page: '0' }, { page: '-1' }, { page: '1.5' }, { page: '1000001' }, { pageSize: '101' },
  { page: ['1', '2'] }, { q: ['name'] }, { q: 'x'.repeat(101) }, { status: 'unknown' }])('invalid query %j is rejected', query => {
  expect(() => parseCommunityMemberListQuery(query, statuses)).toThrow(CommunityMemberListQueryError);
});
it('defaults are bounded and names are trimmed', () => {
  expect(parseCommunityMemberListQuery({}, statuses)).toEqual({ q: '', page: 1, pageSize: 20 });
  expect(parseCommunityMemberListQuery({ q: '  회원  ', pageSize: '100', status: 'active' }, statuses))
    .toEqual({ q: '회원', page: 1, pageSize: 100, status: 'active' });
  expect(() => parseCommunityMemberListQuery({ status: 'pending' }, ['active', 'suspended'])).toThrow('가입 상태');
});

it.each(['review', 'designation'])('%s binds community, literal search and limits with consistent count filters', async kind => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const id = '11111111-1111-4111-8111-111111111111';
  const db = { query: async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    if (sql.startsWith('SELECT id, name FROM communities')) return [{ id, name: '커뮤니티' }];
    return sql.includes('COUNT(*)') ? [{ total: 21 }] : [];
  }, transaction: async () => undefined };
  const query = parseCommunityMemberListQuery({ q: "이름%_\\'", page: '999', status: 'active' }, statuses);
  const result = kind === 'review' ? await new CommunityLifecycleService(db as any).listMembershipsForReview({ communityId: id, query })
    : await new CommunityOperatorDesignationService(db as any).listMembers(id, query);
  expect(result.pagination).toEqual({ total: 21, totalPages: 2, page: 2, pageSize: 20 });
  const count = calls.find(c => c.sql.includes('COUNT(*)'))!;
  const rows = calls.at(-1)!;
  expect(count.params[0]).toBe(id);
  expect(count.params.slice(-2)).toEqual(['active', "%이름\\%\\_\\\\'%"]);
  expect(rows.params).toEqual([...count.params, 20, 20]);
  for (const call of [count, rows]) {
    expect(call.sql).toContain('cm.community_id = $1');
    expect(call.sql).toMatch(/AND cm.status = \$\d/);
    expect(call.sql).toMatch(/u.name ILIKE \$\d/);
    expect(call.sql).not.toContain(query.q);
  }
  expect(rows.sql).toMatch(/cm.id ASC\s+LIMIT \$\d OFFSET \$\d/);
  if (kind === 'designation') expect(count.sql).toContain("cm.status IN ('active', 'suspended')");
});

it('empty filtered results return the first page without unbounded fetching', async () => {
  const query = parseCommunityMemberListQuery({ page: '10', q: '없는 회원' }, statuses);
  const db = { query: jest.fn().mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]) };
  const result = await new CommunityLifecycleService(db as any).listMembershipsForReview({ communityId: 'c1', query });
  expect(result).toEqual({ memberships: [], pagination: { total: 0, totalPages: 1, page: 1, pageSize: 20 } });
  expect(db.query.mock.calls[1][1].slice(-2)).toEqual([20, 0]);
});

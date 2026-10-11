import { forumFailureFilters } from '../funding-forum-failure-filters.js';

const trialId = '00000000-0000-4000-8000-000000000001';
it('retains the default and bounded pagination contract with a deterministic offset', () => {
  expect(forumFailureFilters({})).toEqual({ trialId: undefined, resolved: undefined, limit: 50, page: 1, offset: 0 });
  expect(forumFailureFilters({ trialId, resolved: 'false', limit: '200', page: '3' })).toEqual({ trialId, resolved: 'false', limit: 100, page: 3, offset: 200 });
});
it.each([
  { trialId: 'not-a-uuid' }, { trialId: [trialId] }, { resolved: 'unknown' }, { resolved: ['false'] },
  { page: '1.5' }, { page: 'Infinity' }, { page: '0' }, { page: ['2'] }, { page: '9007199254740991', limit: '100' },
  { limit: '-2' }, { limit: '2.5' }, { limit: 'invalid' },
])('rejects malformed query %j instead of sending it to the database', query => {
  expect(forumFailureFilters(query)).toBeNull();
});

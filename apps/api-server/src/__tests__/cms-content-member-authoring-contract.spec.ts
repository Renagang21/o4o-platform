/** PH member authoring retires; historical membership identifiers remain readable. */
import {
  resolveCmsMemberAuthoring,
  authorizeCmsMemberCreate,
  authorizeCmsMemberUpdate,
  authorizeCmsMemberTransition,
  hasActiveCmsServiceMembership,
} from '../routes/cms-content/cms-content-member-authoring.js';

const member = (serviceKey: string, status = 'active') => ({
  id: 'user-1', roles: [], memberships: [{ serviceKey, status }],
});

it.each(['kpa-society', 'kpa', 'cosmetics', 'k-cosmetics', 'neture', 'pharmacy-hub'])(
  '%s does not provide common CMS member authoring', (serviceKey) => {
    expect(resolveCmsMemberAuthoring(serviceKey)).toBeNull();
    expect(authorizeCmsMemberCreate(member(serviceKey), serviceKey, 'knowledge')).toEqual({ allowed: false, reason: 'NO_CAPABILITY' });
  },
);

it.each(['draft', 'pending', 'published', 'archived'])(
  'an active historical PH member cannot edit or transition their %s content', (status) => {
    const content = { serviceKey: 'pharmacy-hub', authorRole: 'community', status, createdBy: 'user-1' };
    expect(authorizeCmsMemberUpdate(member('pharmacy-hub'), content)).toBe(false);
    for (const next of ['draft', 'pending', 'published', 'archived']) {
      expect(authorizeCmsMemberTransition(member('pharmacy-hub'), content, next)).toBe(false);
    }
  },
);

it('historical membership remains a ledger identifier, with no authoring capability', () => {
  expect(hasActiveCmsServiceMembership(member('pharmacy-hub'), 'pharmacy-hub')).toBe(true);
  expect(hasActiveCmsServiceMembership(member('pharmacy-hub'), 'kpa')).toBe(false);
  expect(resolveCmsMemberAuthoring(null)).toBeNull();
  expect(resolveCmsMemberAuthoring('')).toBeNull();
});

import {
 resolveCmsMemberAuthoring, authorizeCmsMemberCreate,
 authorizeCmsMemberUpdate, authorizeCmsMemberTransition,
} from '../routes/cms-content/cms-content-member-authoring.js';
const user = { id: 'user-1', roles: ['pharmacy-hub:member'], memberships: [{ serviceKey: 'pharmacy-hub', status: 'active' }] };
it('retired PH membership has no authoring capability', () => {
 expect(resolveCmsMemberAuthoring('pharmacy-hub')).toBeNull();
});
it.each(['knowledge', 'hero', 'notice', 'guide', 'news'])('retired PH cannot create %s', type => {
 expect(authorizeCmsMemberCreate(user, 'pharmacy-hub', type)).toEqual({ allowed:false, reason:'NO_CAPABILITY' });
});
it.each(['draft','pending','published','archived'])('even the former author cannot edit or transition %s', status => {
 const content = { serviceKey:'pharmacy-hub', authorRole:'community', status, createdBy:'user-1' };
 expect(authorizeCmsMemberUpdate(user, content)).toBe(false);
 expect(authorizeCmsMemberTransition(user, content, 'pending')).toBe(false);
});
it.each(['kpa-society','k-cosmetics','neture','unknown-service'])('preserves operator-only CMS ledger for %s', serviceKey => {
 expect(resolveCmsMemberAuthoring(serviceKey)).toBeNull();
 expect(authorizeCmsMemberCreate(user, serviceKey, 'knowledge').allowed).toBe(false);
});

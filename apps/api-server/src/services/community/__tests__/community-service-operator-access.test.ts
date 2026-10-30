import { hasCommunityServiceAdmin, hasCommunityServiceOperator } from '../community-service-operator-access.js';
function exec(role: string, status = 'active') {
 return { query: jest.fn(async (sql: string, args: unknown[]) => {
  if (sql.includes('AS verified FROM users')) return [{status:'active',active:true,verified:true}];
  if (sql.startsWith('SELECT id, status')) return [{id:'membership',status}];
  if (sql.includes("role='platform:super_admin'")) return role==='platform:super_admin' ? [{}] : [];
  if (sql.includes('FROM role_assignments ra')) return ['community:admin','community:operator'].includes(role) && (!args[1] || role==='community:admin') ? [{}] : [];
  return [];
 })};
}
it.each(['community:admin','community:operator'])('accepts a live community service role %s', async role => {
 const q=exec(role); expect(await hasCommunityServiceOperator(q as never,'user')).toBe(true);
 const sql=q.query.mock.calls.find(([sql])=>sql.includes('FROM role_assignments ra'))![0];
 expect(sql).toContain('ra.valid_from <= CURRENT_TIMESTAMP');
 expect(sql).toContain('(ra.valid_until IS NULL OR ra.valid_until >= CURRENT_TIMESTAMP)');
});
it('reserves admin-only actions for community admin', async()=>{
 expect(await hasCommunityServiceAdmin(exec('community:operator') as never,'user')).toBe(false);
 expect(await hasCommunityServiceAdmin(exec('community:admin') as never,'user')).toBe(true);
});
it.each(['neture:admin','kpa:admin','supplier:operator'])('does not synthesize service operation from %s',async role=>{
 expect(await hasCommunityServiceOperator(exec(role) as never,'user')).toBe(false);
});
it.each(['suspended','withdrawn','pending'])('blocks operator when own membership is %s',async status=>{
 expect(await hasCommunityServiceOperator(exec('community:admin',status) as never,'user')).toBe(false);
});

it('allows the whole Admin to operate only the O4O direct community without creating membership',async()=>{
 const q=exec('platform:super_admin','pending');
 expect(await hasCommunityServiceAdmin(q as never,'user')).toBe(true);
 expect(q.query.mock.calls.every(([sql])=>!sql.includes('INSERT'))).toBe(true);
});

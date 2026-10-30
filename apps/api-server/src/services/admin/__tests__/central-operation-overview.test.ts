jest.mock('../../../modules/contact-inquiry/inbox-tasks.js', () => ({ readInboxTasks: jest.fn() }));
import { readInboxTasks } from '../../../modules/contact-inquiry/inbox-tasks.js';
import { centralOperationOverview, centralMenuForTask } from '../central-operation-overview.js';
const read = jest.mocked(readInboxTasks);
beforeEach(() => { jest.clearAllMocks(); read.mockResolvedValue([]); });
const db = () => ({ query: jest.fn(async (sql: string) => [{count: sql.includes('contact_inquiries') ? 4 : 1,oldest:'2026-10-01'}]) });
it('adds pending contacts only for delegated inboxes and excludes organization inquiries in SQL', async () => {
  const source=db();
  const result=await centralOperationOverview(source,'recipient',['supplier:admin','funding:admin'],['supplier.inbox']);
  expect(result.services).toEqual(['supplier']);
  expect(result.tasks).toEqual([expect.objectContaining({service:'supplier',key:'contact-inquiries',count:4,available:true,href:'/operator/inbox'})]);
  const contact=source.query.mock.calls.find(([sql])=>sql.includes('contact_inquiries'))!;
  expect(contact[0]).toContain('organization_id IS NULL');
  expect(contact[0]).toContain("status IN ('received','in_review')");
  expect((contact as unknown[])[1]).toEqual(['supplier']);
  expect(centralMenuForTask('supplier','contact-inquiries')).toBe('supplier.inbox');
});
it('does not query contacts when only a non-inbox menu is delegated',async()=>{
  const source=db();await centralOperationOverview(source,'recipient',['supplier:admin'],['supplier.suppliers']);
  expect(source.query.mock.calls.some(([sql])=>sql.includes('contact_inquiries'))).toBe(false);
});
it('does not double-count lecture contacts but supports inbox-only delegation',async()=>{
  read.mockResolvedValue([{key:'lecture-contact',label:'강의 미처리 문의',href:'/operator/contact',count:4,oldest:null,available:true}]);
  const both=await centralOperationOverview(db(),'recipient',['lecture:admin'],['lecture.contact','lecture.inbox']);
  expect(both.tasks.map(task=>task.key)).toEqual(['lecture-contact']);
  const inbox=await centralOperationOverview(db(),'recipient',['lecture:admin'],['lecture.inbox']);
  expect(inbox.tasks.map(task=>task.key)).toEqual(['contact-inquiries']);
});
it('reports query failure and invalid counts as unavailable rather than zero',async()=>{
  for(const invalid of [new Error('unavailable'),{count:-1},{count:'invalid'}]) {
    const source={query:jest.fn(async(sql:string)=>{if(sql.includes('contact_inquiries')){if(invalid instanceof Error)throw invalid;return [invalid];}return [{count:0}];})};
    const result=await centralOperationOverview(source,'recipient',['supplier:admin'],['supplier.inbox']);
    expect(result.tasks[0]).toMatchObject({count:null,oldest:null,available:false});
  }
});
it('covers the tool inboxes already exposed under neture.inbox without including organization data',async()=>{
 const source=db();const result=await centralOperationOverview(source,'recipient',['neture:admin'],['neture.inbox']);
 expect(result.tasks.map(task=>task.key)).toEqual(['contact-inquiries','contact-inquiries-store','contact-inquiries-hospital']);
 const queries=source.query.mock.calls.filter(([sql])=>sql.includes('contact_inquiries')) as unknown as [string,string[]][];
 expect(queries.map(([,args])=>args)).toEqual([['neture'],['store'],['hospital']]);
 expect(queries.every(([sql])=>sql.includes('organization_id IS NULL'))).toBe(true);
});
it('exposes the intake reference only to the same delegated candidate menu',async()=>{
 read.mockResolvedValue([{key:'product-candidates',label:'운영 검토',href:'/operator/product-candidates?queue=review',count:3,oldest:null,available:true},{key:'product-candidate-intake',label:'수집 자료',href:'/operator/product-candidates?queue=intake',count:12000,oldest:null,available:true}]);
 expect(centralMenuForTask('neture','product-candidate-intake')).toBe('neture.candidates');
 const allowed=await centralOperationOverview(db(),'recipient',['neture:admin'],['neture.candidates']);
 expect(allowed.tasks).toHaveLength(2);expect(allowed.tasks[1]).toMatchObject({key:'product-candidate-intake',kind:'reference'});
 const denied=await centralOperationOverview(db(),'recipient',['neture:admin'],['neture.inbox']);
 expect(denied.tasks.some(task=>task.key==='product-candidate-intake'||task.key==='product-candidates')).toBe(false);
});

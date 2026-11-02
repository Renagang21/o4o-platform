import { retryInboxNotification } from '../operator-retry.js';
const localRecipients=jest.fn(), centralRecipients=jest.fn();
jest.mock('../inbox-scope.js',()=>({
 assertInboxWriter:jest.fn(async()=>{}),
 inboxRecipients:(...args:unknown[])=>localRecipients(...args),
 inboxNotificationServiceKey:()=> 'private-service',
 inboxNotificationTarget:()=> '/private-inbox',
}));
jest.mock('../central-contact-access.js',()=>({
 CENTRAL_CONTACT_MENUS:{neture:'neture.inbox'},
 centralContactRecipients:(...args:unknown[])=>centralRecipients(...args),
 centralContactTarget:()=> 'https://admin.neture.co.kr/operations/neture/inbox',
}));
beforeEach(()=>{jest.clearAllMocks();localRecipients.mockResolvedValue([{userId:'local-operator'}]);});
it.each(['business','cooperative'] as const)('keeps %s retry recipients and links inside their independent scope',async kind=>{
 const writes:any[][]=[];
 const manager={query:jest.fn(async(sql:string,parameters?:unknown[])=>{
  if(sql.includes('SELECT id,subject,status'))return [{id:'inquiry',subject:'Synthetic inquiry',status:'received',notification_status:'inapp:fail'}];
  if(sql.includes('INSERT INTO notifications'))writes.push(parameters as any[]);
  return [];
 })};
 const db={transaction:async(fn:any)=>fn(manager)};
 const scope={kind,key:'private-space',name:'Synthetic private space',serviceKey:'neture',organizationId:'private-organization',publicPath:'/contact',managePath:'/private-inbox',taskPath:'/private-inbox'};
 expect(await retryInboxNotification(db as any,scope,'inquiry','local-operator')).toMatchObject({status:'sent',recipients:1});
 expect(centralRecipients).not.toHaveBeenCalled();expect(localRecipients).toHaveBeenCalledWith(manager,scope);
 expect(writes).toHaveLength(1);expect(writes[0].slice(0,3)).toEqual(['local-operator','private-service','private-organization']);
 expect(JSON.parse(writes[0][5])).toEqual({contactInquiryId:'inquiry',targetUrl:'/private-inbox'});
});

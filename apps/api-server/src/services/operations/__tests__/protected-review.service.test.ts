import type {DataSource} from 'typeorm';
jest.mock('../../admin/central-operation-access.js',()=>({centralOperationRoles:jest.fn(async()=>['neture:operator'])}));
jest.mock('../../admin/central-operation-menu-grants.js',()=>({centralOperationMenuKeys:jest.fn(async()=>['neture.qualifications'])}));
import {PharmacistQualificationService} from '../../qualifications/pharmacist-qualification.service.js';
import {CooperativeManagementService} from '../../../modules/neture-pharmacy/services/cooperative-management.service.js';
const target='22222222-2222-4222-8222-222222222222';
function fixture() {
 const query=jest.fn(async(sql:string)=>{
  if(sql.includes('AS protected'))return[{protected:true}];
  if(sql.includes('SELECT * FROM cooperative_memberships'))return[{id:'member',user_id:target,status:'pending'}];
  return [];
 });
 const manager={query};const db={query,transaction:async(work:any)=>work(manager)} as unknown as DataSource;
 return{db,query};
}
it.each(['approve','reject','revoke'] as const)('qualification %s refuses an Admin before domain changes or notification',async action=>{
 const {db,query}=fixture();
 await expect(new PharmacistQualificationService(db).decide('reviewer',target,{action,version:'synthetic',reason:'합성 검토',licenseEvidenceChecked:true})).rejects.toMatchObject({status:403,code:'ADMIN_ACCOUNT_PROTECTED'});
 expect(query.mock.calls.every(([sql])=>sql.startsWith('SELECT'))).toBe(true);
});
it.each(['review','request_changes','approve','reject','request_approve'])('cooperative %s protects the target after local scope checking',async action=>{
 const {db,query}=fixture();const service=new CooperativeManagementService(db);
 const lock=jest.spyOn(service as any,'lock').mockResolvedValue(undefined);
 const access=jest.spyOn(service as any,'requireLocal').mockResolvedValue('admin');
 try{
  await expect(service.memberAction('local-admin','coop','member',action,'합성 검토')).rejects.toMatchObject({status:403,code:'ADMIN_ACCOUNT_PROTECTED'});
  expect(access).toHaveBeenCalledWith(expect.anything(),'local-admin','coop');
  expect(query.mock.calls.every(([sql])=>sql.startsWith('SELECT'))).toBe(true);
 }finally{lock.mockRestore();access.mockRestore();}
});

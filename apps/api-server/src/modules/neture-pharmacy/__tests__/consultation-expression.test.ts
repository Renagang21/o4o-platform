import { ConsultationExpressionService } from '../services/consultation-expression.js';
import { consultationExpressionSchema } from '../services/consultation-expression.contracts.js';
import { resolveStoreAccessLevel } from '../../../services/store/store-membership.service.js';
import { getNetureMainMembershipStatus } from '../../neture/services/neture-main-membership.js';
jest.mock('../../../services/store/store-membership.service.js',()=>({resolveStoreAccessLevel:jest.fn()}));
jest.mock('../../neture/services/neture-main-membership.js',()=>({getNetureMainMembershipStatus:jest.fn()}));
const expression={tone:'friendly',formality:'polite',length:'short'};
beforeEach(()=>{
 jest.clearAllMocks();jest.mocked(resolveStoreAccessLevel).mockResolvedValue({level:'owner',organizationId:'store',memberRole:'owner'});
 jest.mocked(getNetureMainMembershipStatus).mockResolvedValue('active' as never);
});
it('keeps fixed defaults and rejects prompts, role grants and unsupported style fields',()=>{
 expect(consultationExpressionSchema.parse({})).toEqual({tone:'neutral',formality:'polite',length:'standard'});
 for(const field of ['prompt','role','pharmacist','provider','model'])expect(consultationExpressionSchema.safeParse({...expression,[field]:'injected'}).success).toBe(false);
});
it('allows an owner to update only the expression metadata after current account/store checks',async()=>{
 const db={query:jest.fn().mockResolvedValueOnce([{id:'store'}]).mockResolvedValueOnce([{expression}])};
 expect(await new ConsultationExpressionService(db as never).save('owner','store',expression)).toMatchObject({organizationId:'store',canEdit:true,expression});
 expect(db.query.mock.calls[0][1]).toEqual(['store','owner',JSON.stringify(expression)]);
 expect(db.query.mock.calls[0][0]).toContain("om.role='owner'");expect(db.query.mock.calls[0][0]).toContain('jsonb_set');
});
it.each(['member','none','other-store','manager','expired'])('denies %s before any write',async kind=>{
 const db={query:jest.fn()};
 if(kind==='expired')jest.mocked(getNetureMainMembershipStatus).mockResolvedValue('inactive' as never);
 else jest.mocked(resolveStoreAccessLevel).mockResolvedValue({level:kind==='member'?'member':kind==='none'?'none':'owner',organizationId:kind==='other-store'?'other':'store',memberRole:kind==='manager'?'manager':'owner'});
 await expect(new ConsultationExpressionService(db as never).save('actor','store',expression)).rejects.toMatchObject({httpStatus:403});expect(db.query).not.toHaveBeenCalled();
});
it('does not silently replace malformed stored settings with defaults',async()=>{
 const db={query:jest.fn().mockResolvedValue([{expression:{prompt:'bad'}}])};
 await expect(new ConsultationExpressionService(db as never).values('store')).rejects.toMatchObject({httpStatus:503});
});

it('does not advertise editing when main membership is inactive',async()=>{
 jest.mocked(getNetureMainMembershipStatus).mockResolvedValue('inactive' as never);
 const db={query:jest.fn().mockResolvedValue([{expression}])};
 expect(await new ConsultationExpressionService(db as never).read('owner','store')).toMatchObject({canEdit:false});
});

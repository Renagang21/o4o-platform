jest.mock('../../database/connection.js',()=>({AppDataSource:{}}));
jest.mock('../../services/community/community-workspace.service.js',()=>({resolveCommunityWorkspace:jest.fn()}));
import { resolveCommunityWorkspace } from '../../services/community/community-workspace.service.js';
import { requireCommunityAccess } from '../community-access.middleware.js';
async function run(user?: {id:string}) {
 const res:any={status:jest.fn().mockReturnThis(),json:jest.fn()}; const next=jest.fn();
 await (requireCommunityAccess('community') as any)({user},res,next);
 return {res,next};
}
beforeEach(()=>jest.clearAllMocks());
it('requires identity before resolving service membership',async()=>{
 const {res,next}=await run();expect(res.status).toHaveBeenCalledWith(401);expect(next).not.toHaveBeenCalled();expect(resolveCommunityWorkspace).not.toHaveBeenCalled();
});
it('accepts only an allowed live workspace',async()=>{
 (resolveCommunityWorkspace as jest.Mock).mockResolvedValue({allowed:true});
 const {next}=await run({id:'member'});expect(next).toHaveBeenCalledWith();
});
it('denies a suspended service member',async()=>{
 (resolveCommunityWorkspace as jest.Mock).mockResolvedValue({allowed:false,reason:'COMMUNITY_SERVICE_MEMBERSHIP_REQUIRED'});
 const {res,next}=await run({id:'member'});expect(res.status).toHaveBeenCalledWith(403);expect(next).not.toHaveBeenCalled();
});
it('does not resurrect retired spaces',async()=>{
 (resolveCommunityWorkspace as jest.Mock).mockResolvedValue(null);
 const {res}=await run({id:'member'});expect(res.status).toHaveBeenCalledWith(404);
});
it('forwards failed DB reads without granting access',async()=>{
 const failure=new Error('DB unavailable');(resolveCommunityWorkspace as jest.Mock).mockRejectedValue(failure);
 const {next}=await run({id:'member'});expect(next).toHaveBeenCalledWith(failure);
});

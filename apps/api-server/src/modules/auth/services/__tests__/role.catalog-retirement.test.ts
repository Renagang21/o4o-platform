const mockRepo={find:jest.fn(),findOne:jest.fn(),save:jest.fn(),create:jest.fn(),count:jest.fn()};
jest.mock('../../../../database/connection.js',()=>({AppDataSource:{getRepository:()=>mockRepo}}));
import {RoleService} from '../role.service.js';
const service=new RoleService();
beforeEach(()=>jest.clearAllMocks());
it('DB role catalog hides PH rows by both namespace and service affinity',async()=>{
 mockRepo.find.mockResolvedValue([{name:'pharmacy-hub:admin',serviceKey:'pharmacy-hub'},{name:'member',serviceKey:'pharmacy-hub'},{name:'neture:operator',serviceKey:'neture'}]);
 expect(await service.getAllRoles()).toEqual([{name:'neture:operator',serviceKey:'neture'}]);
});
it.each(['getRolesByService','getAssignableRoles'] as const)('%s cannot expose retired catalogs',async method=>{
 expect(await service[method]('pharmacy-hub')).toEqual([]);
 expect(mockRepo.find).not.toHaveBeenCalled();
});
it.each(['updateRole','deleteRole'] as const)('opaque PH ID cannot be mutated through %s',async method=>{
 mockRepo.findOne.mockResolvedValue({name:'member',serviceKey:'pharmacy-hub'});
 const action=method==='updateRole'?service.updateRole('opaque-id',{isActive:true}):service.deleteRole('opaque-id');
 await expect(action).rejects.toMatchObject({code:'SERVICE_RETIRED',httpStatus:410});
 expect(mockRepo.save).not.toHaveBeenCalled();
});
it('PH role creation cannot recreate catalog data',async()=>{
 await expect(service.createRole({name:'pharmacy-hub:admin',serviceKey:'pharmacy-hub',roleKey:'admin',displayName:'retired'})).rejects.toMatchObject({httpStatus:410});
 expect(mockRepo.findOne).not.toHaveBeenCalled();
 expect(mockRepo.save).not.toHaveBeenCalled();
});

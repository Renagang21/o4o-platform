const mockRepository = {find:jest.fn(),findOne:jest.fn(),save:jest.fn(),create:jest.fn()};
jest.mock('../../../../database/connection.js',()=>({AppDataSource:{getRepository:()=>mockRepository}}));
import { RoleAssignmentService } from '../role-assignment.service.js';
const service = new RoleAssignmentService();
beforeEach(()=>jest.clearAllMocks());
const assignment = (role:string,valid=true)=>({role,isValidNow:()=>valid});
it('DB-backed auth context excludes active PH capabilities while preserving current roles',async()=>{
 mockRepository.find.mockResolvedValue([assignment('pharmacy-hub:admin'),assignment('pharmacy-hub:operator'),assignment('cosmetics:admin'),assignment('cosmetics:operator'),assignment('neture:operator'),assignment('kpa:store_owner'),assignment('lecture:admin',false)]);
 expect(await service.getRoleNames('user')).toEqual(['neture:operator','kpa:store_owner']);
});
it('PH single-role checks fail before repository reads',async()=>{
 expect(await service.hasRole('user','pharmacy-hub:admin')).toBe(false);
 expect(mockRepository.findOne).not.toHaveBeenCalled();
});
it('PH-only any-role results cannot grant permission',async()=>{
 mockRepository.find.mockResolvedValue([assignment('pharmacy-hub:operator')]);
 expect(await service.hasAnyRole('user',['pharmacy-hub:operator'])).toBe(false);
 mockRepository.find.mockResolvedValue([assignment('neture:operator')]);
 expect(await service.hasAnyRole('user',['neture:operator'])).toBe(true);
});
it('Ph role cannot be recreated by direct service callers before purge',async()=>{
 await expect(service.assignRole({userId:'user',role:' pharmacy-hub:operator '})).rejects.toMatchObject({code:'SERVICE_RETIRED',httpStatus:410});
 expect(mockRepository.findOne).not.toHaveBeenCalled();
 expect(mockRepository.save).not.toHaveBeenCalled();
});

it.each(['cosmetics:admin', ' cosmetics:store_owner ', 'k-cosmetics:operator'])('retired cosmetics role %s cannot be newly assigned', async role => {
 await expect(service.assignRole({userId:'user',role})).rejects.toMatchObject({code:'SERVICE_RETIRED',httpStatus:410});
 expect(mockRepository.findOne).not.toHaveBeenCalled();
 expect(mockRepository.save).not.toHaveBeenCalled();
});

it.each(['cosmetics:admin', 'cosmetics:operator'])('retired effective capability %s is denied before single-role lookup', async role => {
 expect(await service.hasRole('user', role)).toBe(false);
 expect(mockRepository.findOne).not.toHaveBeenCalled();
 mockRepository.find.mockResolvedValue([assignment(role)]);
 expect(await service.hasAnyRole('user', [role])).toBe(false);
});

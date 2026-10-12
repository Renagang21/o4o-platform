import {PlatformServiceCatalogService} from '../platform-service-catalog.service.js';
const rows:any[]=[{code:'pharmacy-hub',status:'active',entryUrl:'https://retired.example'},{code:'neture',status:'active'}];
const repo={find:jest.fn(async()=>rows),findOne:jest.fn(),save:jest.fn()};
const db:any={getRepository:()=>repo,query:jest.fn(async()=>[{service_key:'pharmacy-hub',status:'active'},{service_key:'neture',status:'active'}])};
const service=new PlatformServiceCatalogService(db);
beforeEach(()=>jest.clearAllMocks());
it.each([undefined,'user'])('active legacy DB rows do not reappear in public catalog for %s',async user=>{
 const result=await service.listVisibleServicesForUser(user);
 expect(result.map(s=>s.code)).toEqual(['neture']);
 expect(JSON.stringify(result)).not.toContain('retired.example');
});
it('retired service code cannot resolve or update its legacy row',async()=>{
 expect(await service.getServiceByCode('pharmacy-hub')).toBeNull();
 await expect(service.updateService('pharmacy-hub',{status:'active'})).rejects.toMatchObject({httpStatus:410});
 expect(repo.findOne).not.toHaveBeenCalled();
 expect(repo.save).not.toHaveBeenCalled();
});

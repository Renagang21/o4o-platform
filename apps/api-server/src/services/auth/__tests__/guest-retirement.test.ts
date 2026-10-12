const mockRepo={create:jest.fn(v=>v),save:jest.fn(async()=>undefined)};
jest.mock('../../../database/connection.js',()=>({AppDataSource:{getRepository:()=>mockRepo}}));
jest.mock('../../../utils/token.utils.js',()=>({generateGuestAccessToken:jest.fn(()=> 'synthetic-token'),getGuestTokenConfig:()=>({guestTokenExpiresIn:7200})}));
import {AuthGuestService} from '../auth-guest.service.js';
import {generateGuestAccessToken} from '../../../utils/token.utils.js';
const service=new AuthGuestService();
beforeEach(()=>jest.clearAllMocks());
it.each(['pharmacy-hub',' pharmacy-hub '])('cannot create guest identity or audit data for %s',async serviceId=>{
 await expect(service.issueGuestToken({serviceId,entryType:'qr'})).rejects.toMatchObject({code:'SERVICE_RETIRED',httpStatus:410});
 expect(generateGuestAccessToken).not.toHaveBeenCalled();
 expect(mockRepo.save).not.toHaveBeenCalled();
});
it('client metadata cannot relabel a current guest audit as PH',async()=>{
 const result=await service.issueGuestToken({serviceId:'neture',entryType:'qr',metadata:{serviceId:'pharmacy-hub'}});
 expect(result.context.serviceId).toBe('neture');
 expect(mockRepo.create.mock.calls[0][0].details.serviceId).toBe('neture');
});

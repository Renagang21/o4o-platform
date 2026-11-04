import {PrivacyRetentionJob} from '../jobs/privacy-retention.job.js';
import {AccountErasureService} from '../services/privacy/account-erasure.service.js';
import {PrivacyRetentionService} from '../services/privacy-retention.service.js';
import logger from '../utils/logger.js';
jest.mock('../database/connection.js',()=>({AppDataSource:{isInitialized:true}}));
jest.mock('../utils/logger.js',()=>({__esModule:true,default:{info:jest.fn(),warn:jest.fn(),error:jest.fn()}}));
jest.mock('../services/privacy-retention.service.js',()=>({PrivacyRetentionService:jest.fn(()=>({apply:jest.fn(async()=>({tables:[],total_eligible:0,total_unresolved:0,total_deleted:0})),dryRun:jest.fn(async()=>({tables:[],total_eligible:0,total_unresolved:0,total_deleted:0}))}))}));
jest.mock('../services/privacy/account-erasure.service.js',()=>({...jest.requireActual('../services/privacy/account-erasure.service.js'),AccountErasureService:jest.fn()}));
const keys=['ACCOUNT_ERASURE_MODE','ACCOUNT_ERASURE_FILE_INVENTORY_REVIEW','ACCOUNT_ERASURE_SYSTEM_YEARS','ACCOUNT_ERASURE_SYSTEM_POLICY_BASIS','PRIVACY_RETENTION_MODE','PRIVACY_RETENTION_ENABLED'];
let old:Record<string,string|undefined>;const report=jest.fn();
beforeEach(()=>{
 old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));jest.clearAllMocks();
 Object.assign(process.env,{ACCOUNT_ERASURE_MODE:'apply',ACCOUNT_ERASURE_FILE_INVENTORY_REVIEW:'confirmed',ACCOUNT_ERASURE_SYSTEM_YEARS:'2',ACCOUNT_ERASURE_SYSTEM_POLICY_BASIS:'fixture-policy',PRIVACY_RETENTION_MODE:'apply',PRIVACY_RETENTION_ENABLED:'true'});
 report.mockResolvedValue({eligible:2,overdueReviews:1,deleted:2});
 (AccountErasureService as jest.Mock).mockImplementation(()=>({retentionReport:report}));
});
afterEach(()=>{for(const key of keys){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}});
it('OFF keeps the existing six-target retention job and never executes account minimum maintenance',async()=>{
 process.env.ACCOUNT_ERASURE_MODE='off';await new PrivacyRetentionJob().runNow();
 expect(PrivacyRetentionService).toHaveBeenCalled();expect(AccountErasureService).not.toHaveBeenCalled();expect(report).not.toHaveBeenCalled();
});
it('dry-run never applies new minimum-record deletion and shares actual runtime configuration',async()=>{
 process.env.PRIVACY_RETENTION_MODE='dry-run';await new PrivacyRetentionJob().runNow();
 expect(AccountErasureService).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({enabled:true,inventoryReviewed:true,systemYears:2,systemBasis:'fixture-policy'}));
 expect(report).toHaveBeenCalledWith(expect.any(Date),false);
});
it('apply reuses the existing expiry and hold method rather than invoking account erasure',async()=>{
 await new PrivacyRetentionJob().runNow();expect(report).toHaveBeenCalledWith(expect.any(Date),true);
 expect(logger.info).toHaveBeenCalledWith('[privacy-retention] account erasure minimum records',{mode:'apply',eligible:2,overdueReviews:1,deleted:2});
});
it('failed minimum maintenance logs a fixed message without raw private errors and leaves other cleanup intact',async()=>{
 report.mockRejectedValue(new Error('synthetic-private-copy@fixture.invalid'));await new PrivacyRetentionJob().runNow();
 expect(logger.error).toHaveBeenCalledWith('[privacy-retention] account erasure minimum records unavailable');
 expect(JSON.stringify((logger.error as jest.Mock).mock.calls)).not.toContain('synthetic-private-copy');
 expect(logger.info).toHaveBeenCalledWith('[privacy-retention] apply done',expect.anything());
});

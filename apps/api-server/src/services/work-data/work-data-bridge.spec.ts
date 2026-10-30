import { pcWorkData } from './work-data-bridge.js';
import { resolveTargetDevice, listUserDevices, issueCommand, awaitCommandResult } from '../local-agent/local-agent-service.js';
jest.mock('../local-agent/local-agent-service.js',()=>({resolveTargetDevice:jest.fn(),listUserDevices:jest.fn(),issueCommand:jest.fn(),awaitCommandResult:jest.fn()}));
const first='11111111-1111-4111-8111-111111111111',second='22222222-2222-4222-8222-222222222222';
const user='33333333-3333-4333-8333-333333333333',owner={key:'user:'+user,userId:user,organizationId:null};
const device=(id:string,online=true)=>({id,userId:user,status:'active',online,capabilities:{pharmacyData:true}} as any);
const db={query:jest.fn(async()=>[{status:'active',isActive:true,isEmailVerified:true,account_status:'active',account_active:true,email_verified:true,membership_status:'active'}])} as any;
beforeEach(()=>{jest.clearAllMocks();jest.mocked(resolveTargetDevice).mockResolvedValue({status:'ok',device:device(first)} as any);jest.mocked(listUserDevices).mockResolvedValue([device(second),device(first)]);jest.mocked(issueCommand).mockResolvedValue({ok:true,command:{commandId:'command-fixture'}} as any);jest.mocked(awaitCommandResult).mockResolvedValue({status:'success',data:{revision:7,records:[],counts:{},next:null}} as any);});
it('pins later pages and writes even when another PC becomes the newest with the same revision',async()=>{
 const initial=await pcWorkData(db,user,owner,'read',{limit:100});expect(initial.deviceId).toBe(first);
 jest.mocked(resolveTargetDevice).mockResolvedValue({status:'ok',device:device(second)} as any);
 await pcWorkData(db,user,owner,'read',{after:'product:p1',limit:100},initial.deviceId);
 await pcWorkData(db,user,owner,'write',{mode:'user',records:[],expectedRevision:7},initial.deviceId);
 expect(jest.mocked(issueCommand).mock.calls.map(call=>call[1].deviceId)).toEqual([first,first,first]);
 expect(listUserDevices).toHaveBeenCalledWith(db,user);
 expect(jest.mocked(issueCommand).mock.calls[1][1].args).not.toHaveProperty('deviceId');
});
it('never falls back from an offline, revoked, or foreign bound source to another online PC',async()=>{
 jest.mocked(listUserDevices).mockResolvedValue([device(second),device(first,false)]);
 await expect(pcWorkData(db,user,owner,'read',{},first)).rejects.toMatchObject({code:'LOCAL_AGENT_OFFLINE'});
 jest.mocked(listUserDevices).mockResolvedValue([device(second)]);
 await expect(pcWorkData(db,user,owner,'read',{},first)).rejects.toMatchObject({code:'WORK_DATA_PC_SOURCE_UNAVAILABLE'});
 await expect(pcWorkData(db,user,owner,'write',{})).rejects.toMatchObject({code:'WORK_DATA_PC_SOURCE_REQUIRED'});
 expect(issueCommand).not.toHaveBeenCalled();expect(resolveTargetDevice).not.toHaveBeenCalled();
});

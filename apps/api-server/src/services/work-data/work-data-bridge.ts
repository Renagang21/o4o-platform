import type { DataSource } from 'typeorm';
import { resolveTargetDevice, listUserDevices, issueCommand, awaitCommandResult } from '../local-agent/local-agent-service.js';
import { LOCAL_AGENT_ACTIONS } from '../local-agent/local-agent-protocol.js';
import { WorkDataError, WorkDataService, assertWorkDataOwner, type WorkDataOwner } from './work-data.service.js';
import { pickPharmacyResult } from './contract.js';

export async function pcWorkData(db: DataSource,userId: string,owner: WorkDataOwner,mode: 'read'|'write',args: Record<string,unknown>,boundDeviceId?:unknown) {
  await assertWorkDataOwner(db,userId,owner,mode==='write');
  if(mode==='write' && boundDeviceId===undefined)throw new WorkDataError('WORK_DATA_PC_SOURCE_REQUIRED');
  let device;
  if(boundDeviceId!==undefined){
    if(typeof boundDeviceId!=='string'||!/^[a-f0-9-]{36}$/i.test(boundDeviceId))throw new WorkDataError('WORK_DATA_PC_SOURCE_INVALID');
    device=(await listUserDevices(db,userId)).find(node=>node.id===boundDeviceId);
    if(!device)throw new WorkDataError('WORK_DATA_PC_SOURCE_UNAVAILABLE',409);
    if(!device.online)throw new WorkDataError('LOCAL_AGENT_OFFLINE',409);
  }else{
    const selected=await resolveTargetDevice(db,userId,{need:'pharmacy_data'});
    if(selected.status!=='ok')throw new WorkDataError(selected.status==='none'?'LOCAL_AGENT_NO_DEVICE':'LOCAL_AGENT_OFFLINE',409);
    device=selected.device;
  }
  if(device.capabilities?.pharmacyData!==true)throw new WorkDataError('PC_PROGRAM_UPDATE_REQUIRED',409);
  const action=mode==='read'?LOCAL_AGENT_ACTIONS.DATA_PHARMACY_READ:LOCAL_AGENT_ACTIONS.DATA_PHARMACY_WRITE;
  const issued=await issueCommand(db,{userId,deviceId:device.id,toolName:'assistant.work_data.'+mode,action,args:{...args,owner:owner.key} as any});
  if(!issued.ok)throw new WorkDataError('WORK_DATA_PC_UNAVAILABLE',503);
  const result=await awaitCommandResult(db,issued.command.commandId);
  if(result.status!=='success')throw new WorkDataError(result.errorCode==='PHARMACY_REVISION_CONFLICT'?'WORK_DATA_CONFLICT':'WORK_DATA_PC_UNAVAILABLE',409);
  const data=pickPharmacyResult(result.data);
  if(!Number.isSafeInteger(data.revision))throw new WorkDataError('WORK_DATA_PC_RESPONSE_INVALID',502);
  return {location:'pc',deviceId:device.id,owner:owner.key,...data};
}
export async function readWorkData(db:DataSource,userId:string,owner:WorkDataOwner,options:Record<string,unknown>={}) {
  const service=new WorkDataService(db),consent=await service.consent(userId,owner);
  const {deviceId,location,...query}=options;
  if(location!==undefined && location!=='pc' && location!=='server')throw new WorkDataError('WORK_DATA_SOURCE_INVALID');
  if(location==='server' && !consent.enabled)throw new WorkDataError('WORK_DATA_CONSENT_REQUIRED',403);
  if(location==='pc' && !deviceId)throw new WorkDataError('WORK_DATA_PC_SOURCE_REQUIRED');
  if(consent.enabled && location!=='pc')return service.query(userId,owner,query as any);
  return {...await pcWorkData(db,userId,owner,'read',query,deviceId),consent};
}

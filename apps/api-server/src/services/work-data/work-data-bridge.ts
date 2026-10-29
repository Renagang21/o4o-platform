import type { DataSource } from 'typeorm';
import { resolveTargetDevice, issueCommand, awaitCommandResult } from '../local-agent/local-agent-service.js';
import { LOCAL_AGENT_ACTIONS } from '../local-agent/local-agent-protocol.js';
import { WorkDataError, WorkDataService, assertWorkDataOwner, type WorkDataOwner } from './work-data.service.js';
import { pickPharmacyResult } from './contract.js';

export async function pcWorkData(db: DataSource,userId: string,owner: WorkDataOwner,mode: 'read'|'write',args: Record<string,unknown>) {
  await assertWorkDataOwner(db,userId,owner,mode==='write');
  const device=await resolveTargetDevice(db,userId,{need:'pharmacy_data'});
  if(device.status!=='ok')throw new WorkDataError(device.status==='none'?'LOCAL_AGENT_NO_DEVICE':'LOCAL_AGENT_OFFLINE',409);
  if(device.device.capabilities?.pharmacyData!==true)throw new WorkDataError('PC_PROGRAM_UPDATE_REQUIRED',409);
  const action=mode==='read'?LOCAL_AGENT_ACTIONS.DATA_PHARMACY_READ:LOCAL_AGENT_ACTIONS.DATA_PHARMACY_WRITE;
  const issued=await issueCommand(db,{userId,deviceId:device.device.id,toolName:'assistant.work_data.'+mode,action,args:{...args,owner:owner.key} as any});
  if(!issued.ok)throw new WorkDataError('WORK_DATA_PC_UNAVAILABLE',503);
  const result=await awaitCommandResult(db,issued.command.commandId);
  if(result.status!=='success')throw new WorkDataError(result.errorCode==='PHARMACY_REVISION_CONFLICT'?'WORK_DATA_CONFLICT':'WORK_DATA_PC_UNAVAILABLE',409);
  const data=pickPharmacyResult(result.data);
  if(!Number.isSafeInteger(data.revision))throw new WorkDataError('WORK_DATA_PC_RESPONSE_INVALID',502);
  return {location:'pc',...data};
}
export async function readWorkData(db:DataSource,userId:string,owner:WorkDataOwner,options:Record<string,unknown>={}) {
  const service=new WorkDataService(db),consent=await service.consent(userId,owner);
  if(consent.enabled)return service.query(userId,owner,options as any);
  return {...await pcWorkData(db,userId,owner,'read',options),consent};
}

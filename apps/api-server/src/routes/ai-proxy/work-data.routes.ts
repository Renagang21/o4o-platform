import { methodSharing } from '../../services/work-data/shared-methods.js';
import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireNetureMainMembership } from '../../middleware/neture-main-membership.middleware.js';
import type { AuthRequest } from '../../types/auth.js';
import { WorkDataService, WorkDataError, resolveWorkDataOwner } from '../../services/work-data/work-data.service.js';
import { readWorkData, pcWorkData } from '../../services/work-data/work-data-bridge.js';
import { listUserDevices, resolveTargetDevice } from '../../services/local-agent/local-agent-service.js';

export const workDataMessage: Record<string,string>={
  WORK_DATA_TRANSFERRING:'서버로 자료를 옮기고 있어요. 자료가 있는 PC를 켜 두세요. 완료되면 이어서 이용할 수 있어요.',
  WORK_DATA_NO_LOCAL_RETURN:'서버에서 계속 작업해 주세요. 이 업무를 다시 PC 저장 방식으로 바꾸지는 않아요.',
  WORK_DATA_STOPPED:'서버 이용이 중단됐어요. 동의하고 서버에서 새로 시작할 수 있어요.',
  WORK_DATA_STORAGE_CHOICE_REQUIRED:'이 PC 자료를 옮길지 서버에서 새로 시작할지 선택해 주세요.',
  WORK_DATA_CONSENT_REQUIRED:'서버 이용에 동의하면 보관된 자료를 어디서나 사용할 수 있어요.',
  WORK_DATA_FORBIDDEN:'이 자료를 이용할 권한을 확인해 주세요.',
  WORK_DATA_CONFLICT:'다른 곳에서 자료가 바뀌었어요. 최신 자료를 다시 확인해 주세요. 입력한 내용은 유지됩니다.',
  WORK_DATA_PC_SOURCE_UNAVAILABLE:'자료를 불러온 PC를 다시 연결해 주세요. 다른 PC의 자료로 바꾸지 않았어요.',
  WORK_DATA_PC_SOURCE_REQUIRED:'자료를 다시 불러온 뒤 저장해 주세요.',
  PC_PROGRAM_UPDATE_REQUIRED:'PC 연결 프로그램을 업데이트해 주세요.',
  LOCAL_AGENT_NO_DEVICE:'자료가 있는 PC를 연결해 주세요.',
  LOCAL_AGENT_OFFLINE:'자료가 있는 PC가 꺼져 있어요. 서버 보관을 허용한 자료는 PC 없이 사용할 수 있어요.',
};
export function createWorkDataRouter(db: DataSource) {
  const router=Router(),service=new WorkDataService(db);
  const run=(fn:(req:AuthRequest)=>Promise<unknown>)=>async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    try{res.json({success:true,data:await fn(req)});}
    catch(error){const known=error instanceof WorkDataError;res.status(known?error.status:503).json({success:false,code:known?error.code:'WORK_DATA_UNAVAILABLE',error:known?(workDataMessage[error.code]??'자료 형식과 최신 상태를 확인해 주세요.'):'자료를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.'});}
  };
  router.post('/method-sharing',authenticate,requireNetureMainMembership(db),run(async req=>{
    if(req.body?.enabled!==undefined && typeof req.body.enabled!=='boolean')throw new WorkDataError('SHARING_INVALID');
    return methodSharing(db,req.user.id,req.body?.enabled);
  }));
  router.post('/tasks',authenticate,requireNetureMainMembership(db),run(async req=>{
    const owner=await resolveWorkDataOwner(db,req.user.id,req.body?.workScope);
    return db.query(`SELECT t.id AS "taskId",t.target_id AS "targetId",t.target_kind AS "targetKind",
      r.run_id AS "runId",r.expires_at AS "expiresAt",t.updated_at AS "updatedAt"
      FROM assistant_tasks t JOIN LATERAL (
        SELECT run_id,expires_at FROM work_run_coordination r WHERE r.task_id=t.id AND r.user_id=$1
        AND r.status='waiting_for_user' AND r.expires_at>now() ORDER BY updated_at DESC LIMIT 1
      ) r ON true WHERE t.requested_by_user_id=$1 AND t.status='waiting_for_user'
      AND (($2::uuid IS NULL AND t.ownership_scope='USER') OR (t.ownership_scope='ORGANIZATION' AND t.organization_id=$2))
      ORDER BY t.updated_at DESC LIMIT 20`,[req.user.id,owner.organizationId]);
  }));
  router.post('/status',authenticate,requireNetureMainMembership(db),run(async req=>{
    const owner=await resolveWorkDataOwner(db,req.user.id,req.body?.workScope);
    const status=await service.consent(req.user.id,owner);
    const sourceOnline=status.sourceDeviceId?(await listUserDevices(db,req.user.id)).some(d=>d.id===status.sourceDeviceId && d.online):undefined;
    return {...status,sourceOnline};
  }));
  router.post('/consent',authenticate,requireNetureMainMembership(db),run(async req=>{
    const owner=await resolveWorkDataOwner(db,req.user.id,req.body?.workScope);
    let sourceDeviceId:string|null=null;
    if(req.body?.enabled===true){
      const current=await service.consent(req.user.id,owner);
      if(req.body?.deviceId!==undefined){
        const device=(await listUserDevices(db,req.user.id)).find(d=>d.id===req.body.deviceId);
        if(!device?.online)throw new WorkDataError('WORK_DATA_PC_SOURCE_UNAVAILABLE',409);
        if(device.capabilities?.serverAuthority!==true)throw new WorkDataError('PC_PROGRAM_UPDATE_REQUIRED',409);
        sourceDeviceId=device.id;
      }else if(current.storageMode==='local' || (current.storageMode==='transferring' && !current.sourceDeviceId) || current.storageMode==='stopped'){
        if(req.body?.start!=='empty' || current.storageMode==='transferring')throw new WorkDataError('WORK_DATA_STORAGE_CHOICE_REQUIRED');
      }
    }
    return service.setConsent(req.user.id,owner,req.body?.enabled,sourceDeviceId);
  }));
  router.post('/pc-read',authenticate,requireNetureMainMembership(db),run(async req=>{
    const owner=await resolveWorkDataOwner(db,req.user.id,req.body?.workScope);
    return pcWorkData(db,req.user.id,owner,'read',{limit:1},req.body?.deviceId);
  }));
  router.post('/transition-source',authenticate,requireNetureMainMembership(db),run(async req=>{
    await resolveWorkDataOwner(db,req.user.id,req.body?.workScope);
    const selected=await resolveTargetDevice(db,req.user.id,{need:'pharmacy_data'});
    if(selected.status!=='ok')throw new WorkDataError(selected.status==='none'?'LOCAL_AGENT_NO_DEVICE':'LOCAL_AGENT_OFFLINE',409);
    if(selected.device.capabilities?.serverAuthority!==true)throw new WorkDataError('PC_PROGRAM_UPDATE_REQUIRED',409);
    return {deviceId:selected.device.id};
  }));
  router.post('/analysis',authenticate,requireNetureMainMembership(db),run(async req=>{
    const owner=await resolveWorkDataOwner(db,req.user.id,req.body?.workScope);
    return service.analysis(req.user.id,owner);
  }));
  router.post('/read',authenticate,requireNetureMainMembership(db),run(async req=>{
    const owner=await resolveWorkDataOwner(db,req.user.id,req.body?.workScope);
    return readWorkData(db,req.user.id,owner,{...(req.body?.kind?{kind:req.body.kind}:{}),...(req.body?.after?{after:req.body.after}:{}),limit:req.body?.limit??100,...(req.body?.deviceId!==undefined?{deviceId:req.body.deviceId}:{}),...(req.body?.location!==undefined?{location:req.body.location}:{})});
  }));
  router.post('/save',authenticate,requireNetureMainMembership(db),run(async req=>{
    const owner=await resolveWorkDataOwner(db,req.user.id,req.body?.workScope);
    const consent=await service.consent(req.user.id,owner);
    if(req.body?.location==='server'){
      if(!consent.enabled)throw new WorkDataError('WORK_DATA_CONSENT_REQUIRED',403);
      if(req.body?.epoch!==consent.epoch)throw new WorkDataError('WORK_DATA_CONFLICT',409);
      if(!Array.isArray(req.body?.changes))throw new WorkDataError('WORK_DATA_INVALID');
      const changes=req.body.changes;
      if(changes.some(c=>c.lane!=='user'))throw new WorkDataError('WORK_DATA_PROGRAM_SOURCE_REQUIRED');
      const result=await service.sync(req.user.id,owner.key,consent.epoch,changes);
      return {location:'server',...result};
    }
    // Program-file collection is committed on the PC first, then journaled for
    // optional cloud sync. Neither browser nor AI supplies a PC file path.
    if(req.body?.expectedOwner!==owner.key)throw new WorkDataError('WORK_DATA_CONFLICT',409);
    if(!req.body?.deviceId)throw new WorkDataError('WORK_DATA_PC_SOURCE_REQUIRED');
    return pcWorkData(db,req.user.id,owner,'write',{mode:req.body?.mode??'user',expectedRevision:req.body?.expectedRevision,records:req.body?.records},req.body.deviceId);
  }));
  return router;
}

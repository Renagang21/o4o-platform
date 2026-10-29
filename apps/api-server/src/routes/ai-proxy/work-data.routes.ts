import { methodSharing } from '../../services/work-data/shared-methods.js';
import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireNetureMainMembership } from '../../middleware/neture-main-membership.middleware.js';
import type { AuthRequest } from '../../types/auth.js';
import { WorkDataService, WorkDataError, resolveWorkDataOwner } from '../../services/work-data/work-data.service.js';
import { readWorkData, pcWorkData } from '../../services/work-data/work-data-bridge.js';

export const workDataMessage: Record<string,string>={
  WORK_DATA_CONSENT_REQUIRED:'서버 보관을 허용하면 이 자료를 어디서나 사용할 수 있어요.',
  WORK_DATA_FORBIDDEN:'이 자료를 이용할 권한을 확인해 주세요.',
  WORK_DATA_CONFLICT:'다른 곳에서 자료가 바뀌었어요. 최신 자료를 다시 확인해 주세요. 입력한 내용은 유지됩니다.',
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
    return service.consent(req.user.id,owner);
  }));
  router.post('/consent',authenticate,requireNetureMainMembership(db),run(async req=>{
    const owner=await resolveWorkDataOwner(db,req.user.id,req.body?.workScope);
    return service.setConsent(req.user.id,owner,req.body?.enabled);
  }));
  router.post('/pc-read',authenticate,requireNetureMainMembership(db),run(async req=>{
    const owner=await resolveWorkDataOwner(db,req.user.id,req.body?.workScope);
    return pcWorkData(db,req.user.id,owner,'read',{limit:1});
  }));
  router.post('/analysis',authenticate,requireNetureMainMembership(db),run(async req=>{
    const owner=await resolveWorkDataOwner(db,req.user.id,req.body?.workScope);
    return service.analysis(req.user.id,owner);
  }));
  router.post('/read',authenticate,requireNetureMainMembership(db),run(async req=>{
    const owner=await resolveWorkDataOwner(db,req.user.id,req.body?.workScope);
    return readWorkData(db,req.user.id,owner,{...(req.body?.kind?{kind:req.body.kind}:{}),...(req.body?.after?{after:req.body.after}:{}),limit:req.body?.limit??100});
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
    return pcWorkData(db,req.user.id,owner,'write',{mode:req.body?.mode??'user',expectedRevision:req.body?.expectedRevision,records:req.body?.records});
  }));
  return router;
}

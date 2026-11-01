import { createHash, randomUUID } from 'node:crypto';
import { Storage } from '@google-cloud/storage';
import type { DataSource } from 'typeorm';
import { AutomationJob } from '../automation/entities/AutomationJob.entity.js';
import { lockStoredVideo } from '../media/services/stored-video.js';
import { encrypt, decrypt } from '../../utils/crypto.js';
import { registerVideo, type VideoRegistrationInput, type VideoRegistrationScope } from '../../routes/signage/services/video-registration.service.js';
import { YoutubeConnectionService } from './connection.service.js';
import { YoutubeClient } from './youtube-client.js';
import { YoutubeTaskDelivery, youtubeDeliveryConfig } from './task-delivery.js';
import { YOUTUBE_ACTIVE_NOTES, YOUTUBE_CHANNEL_ID, YOUTUBE_JOB_KIND, YoutubeError, type UploadPayload } from './contracts.js';
import type { Notification } from '../../entities/Notification.js';
import { notificationEventHub } from '../../services/forum/NotificationEventHub.js';

const UUID=/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const idFor=(key:string)=>{const raw=createHash('sha256').update(key).digest('hex');return`${raw.slice(0,8)}-${raw.slice(8,12)}-4${raw.slice(13,16)}-a${raw.slice(17,20)}-${raw.slice(20,32)}`;};
const payloadOf=(job:AutomationJob):UploadPayload=>{const p=JSON.parse(job.instructions??'{}') as UploadPayload;if(p.kind!==YOUTUBE_JOB_KIND||p.channelId!==YOUTUBE_CHANNEL_ID||p.actorId!==job.createdBy)throw new YoutubeError('YOUTUBE_INVALID_JOB');return p;};
function view(job:AutomationJob){let p:UploadPayload;try{p=payloadOf(job);}catch{return{id:job.id,name:job.title,state:'needs-review' as const,serviceKey:undefined,organizationId:null,videoUrl:null,errorCode:'YOUTUBE_INVALID_JOB',updatedAt:job.updatedAt};}return{id:job.id,name:p.name,state:p.state,serviceKey:p.serviceKey,organizationId:p.organizationId??null,videoUrl:p.state==='completed'&&p.videoId?`https://www.youtube.com/watch?v=${p.videoId}`:null,errorCode:p.errorCode??null,updatedAt:job.updatedAt};}
export class YoutubeUploadQueue {
  constructor(private db:DataSource,private connection=new YoutubeConnectionService(db),private delivery=new YoutubeTaskDelivery(),private client=new YoutubeClient(),private storage=new Storage(),private authorizer?: (payload:Pick<UploadPayload,'actorId'|'organizationId'|'community'>)=>Promise<void>){}
  async availability(){let deliveryConfigured=true;try{youtubeDeliveryConfig();}catch{deliveryConfigured=false;}const connection=await this.connection.status();return{channelId:YOUTUBE_CHANNEL_ID,ready:connection.connected&&deliveryConfigured,connected:connection.connected,deliveryConfigured};}
  private async authorized(p:Pick<UploadPayload,'actorId'|'organizationId'|'community'>){
    if(this.authorizer)return this.authorizer(p);
    const [account]=await this.db.query('SELECT status,"isActive" AS active,"isEmailVerified" AS verified FROM users WHERE id=$1',[p.actorId]);
    if(!account?.active||!account.verified||!['active','approved'].includes(account.status))throw new YoutubeError('YOUTUBE_REQUEST_ACCESS_REVOKED',403);
    if(p.community){const {resolveCommunityWorkspace}=await import('../../services/community/community-workspace.service.js');if(!(await resolveCommunityWorkspace(this.db,{id:p.actorId},'community'))?.allowed)throw new YoutubeError('YOUTUBE_REQUEST_ACCESS_REVOKED',403);}
    else{const {resolveKpaContentAccess}=await import('../../routes/o4o-store/controllers/kpa-content-organization.js');const access=await resolveKpaContentAccess(this.db,p.actorId,p.organizationId);if(!access.hasAccess||access.organizationId!==p.organizationId)throw new YoutubeError('YOUTUBE_REQUEST_ACCESS_REVOKED',403);}
  }
  async enqueue(scope:VideoRegistrationScope,input:VideoRegistrationInput){
    const availability=await this.availability();if(!availability.ready)throw new YoutubeError(availability.connected?'YOUTUBE_DELIVERY_NOT_CONFIGURED':'YOUTUBE_NOT_CONNECTED');
    if(!input||typeof input.requestId!=='string'||!UUID.test(input.requestId)||typeof input.mediaLibraryAssetId!=='string'||!UUID.test(input.mediaLibraryAssetId)||typeof input.name!=='string'||!input.name.trim()||input.name.length>255||typeof input.description!=='string'||input.description.length>2000||!Array.isArray(input.tags)||input.tags.length>10||input.tags.some(tag=>typeof tag!=='string'||!tag.trim()||tag.length>50))throw new YoutubeError('YOUTUBE_INVALID_REQUEST',400);
    await this.authorized({actorId:scope.actorId,organizationId:scope.organizationId,community:scope.community});
    const id=idFor(`youtube:${scope.actorId}:${scope.serviceKey}:${scope.organizationId??'community'}:${input.requestId}`);
    const inputHash=createHash('sha256').update(JSON.stringify({assetId:input.mediaLibraryAssetId,name:input.name,description:input.description,tags:input.tags})).digest('hex');
    const job=await this.db.transaction(async manager=>{
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[id]);
      const repo=manager.getRepository(AutomationJob),existing=await repo.findOneBy({id});
      if(existing){if(payloadOf(existing).inputHash!==inputHash)throw new YoutubeError('YOUTUBE_REQUEST_CHANGED',409);return existing;}
      await lockStoredVideo(manager,input.mediaLibraryAssetId!,scope.actorId);
      const p:UploadPayload={kind:YOUTUBE_JOB_KIND,channelId:YOUTUBE_CHANNEL_ID,actorId:scope.actorId,serviceKey:scope.serviceKey,organizationId:scope.organizationId,community:scope.community,requestId:input.requestId,inputHash,assetId:input.mediaLibraryAssetId!,name:input.name.trim().slice(0,100),description:input.description!,tags:input.tags!,state:'queued',attempts:0,dispatch:0};
      const row=await repo.save(repo.create({id,type:'VIDEO',title:p.name,createdBy:scope.actorId,status:'WAITING',statusNote:'YOUTUBE:QUEUED',instructions:JSON.stringify(p)}));
      await manager.query(`INSERT INTO media_entity_links(media_asset_id,entity_type,entity_id,purpose) VALUES($1,'video-production-job',$2,'INPUT') ON CONFLICT DO NOTHING`,[p.assetId,id]);
      return row;
    });
    if(payloadOf(job).state==='cancelled')throw new YoutubeError('YOUTUBE_REQUEST_CANCELLED',409);
    if(['failed','needs-review'].includes(payloadOf(job).state))throw new YoutubeError('YOUTUBE_JOB_REVIEW_REQUIRED',409);
    if(['queued','uploading','processing'].includes(payloadOf(job).state))await this.delivery.enqueue(`intake-${id}-${randomUUID()}`);
    return{...view(job),queued:payloadOf(job).state!=='completed'};
  }
  async list(actorId:string){const rows=await this.db.getRepository(AutomationJob).createQueryBuilder('j').where('j.createdBy=:actorId',{actorId}).andWhere("j.statusNote LIKE 'YOUTUBE:%'").orderBy('j.createdAt','DESC').take(30).getMany();return rows.map(view);}
  async cancel(actorId:string,id:string){
    if(!UUID.test(id))throw new YoutubeError('YOUTUBE_JOB_NOT_FOUND',404);
    return this.db.transaction(async manager=>{
      const [lock]=await manager.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS locked',[`youtube-channel:${YOUTUBE_CHANNEL_ID}`]);
      if(!lock.locked)throw new YoutubeError('YOUTUBE_CHANNEL_BUSY',409);
      const repo=manager.getRepository(AutomationJob),job=await repo.findOne({where:{id,createdBy:actorId},lock:{mode:'pessimistic_write'}});if(!job)throw new YoutubeError('YOUTUBE_JOB_NOT_FOUND',404);
      const p=payloadOf(job);if(p.sessionCipher||p.videoId||p.state==='completed')throw new YoutubeError('YOUTUBE_UPLOAD_ALREADY_STARTED',409);
      p.state='cancelled';job.status='CANCELLED';job.statusNote='YOUTUBE:CANCELLED';job.instructions=JSON.stringify(p);await repo.save(job);return view(job);
    });
  }
  async resume(){if(!(await this.availability()).ready)throw new YoutubeError('YOUTUBE_NOT_CONNECTED');await this.delivery.enqueue(`resume-${randomUUID()}`);return{resumed:true};}
  async retry(actorId:string,id:string){
    if(!(await this.availability()).ready)throw new YoutubeError('YOUTUBE_NOT_CONNECTED');
    if(!UUID.test(id))throw new YoutubeError('YOUTUBE_JOB_NOT_FOUND',404);
    const candidate=await this.db.getRepository(AutomationJob).findOneBy({id,createdBy:actorId});
    if(!candidate)throw new YoutubeError('YOUTUBE_JOB_NOT_FOUND',404);
    await this.authorized(payloadOf(candidate));
    const job=await this.db.transaction(async manager=>{
      const repo=manager.getRepository(AutomationJob),job=await repo.findOne({where:{id,createdBy:actorId},lock:{mode:'pessimistic_write'}});if(!job)throw new YoutubeError('YOUTUBE_JOB_NOT_FOUND',404);
      const p=payloadOf(job);
      if(p.state==='completed')return job;
      if(p.state==='cancelled')throw new YoutubeError('YOUTUBE_REQUEST_CANCELLED',409);
      if(p.state==='needs-review'&&!p.videoId)throw new YoutubeError('YOUTUBE_RESULT_UNCERTAIN',409);
      p.state=p.videoId?'processing':p.sessionCipher?'uploading':'queued';if(p.videoId)p.processingStartedAt=new Date().toISOString();p.errorCode=undefined;p.attempts=0;p.dispatch++;
      job.status='WAITING';job.statusNote=`YOUTUBE:${p.state.toUpperCase()}`;job.instructions=JSON.stringify(p);return repo.save(job);
    });
    const p=payloadOf(job);if(p.state!=='completed')await this.delivery.enqueue(`retry-${job.id}-${p.dispatch}`);return view(job);
  }
  async listForAdmin(){const rows=await this.db.getRepository(AutomationJob).createQueryBuilder('j').where("j.statusNote LIKE 'YOUTUBE:%'").orderBy('j.createdAt','DESC').take(100).getMany();return rows.map(job=>{const p=payloadOf(job);return{...view(job),reviewVideoId:p.videoId??null};});}
  async retryForAdmin(id:string){const job=await this.db.getRepository(AutomationJob).findOneBy({id});if(!job)throw new YoutubeError('YOUTUBE_JOB_NOT_FOUND',404);return this.retry(job.createdBy,id);}
  async reconcile(id:string,videoId:string){
    if(!UUID.test(id)||!/^[-\w]{11}$/.test(videoId))throw new YoutubeError('YOUTUBE_INVALID_REQUEST',400);
    const token=await this.connection.accessToken();if(!await this.client.ready(token,videoId))throw new YoutubeError('YOUTUBE_PROCESSING_NOT_READY',409);
    const job=await this.db.transaction(async manager=>{
      const repo=manager.getRepository(AutomationJob),job=await repo.findOne({where:{id},lock:{mode:'pessimistic_write'}});if(!job)throw new YoutubeError('YOUTUBE_JOB_NOT_FOUND',404);
      const p=payloadOf(job);if(p.state!=='needs-review'||(p.videoId&&p.videoId!==videoId))throw new YoutubeError('YOUTUBE_RECONCILE_NOT_ALLOWED',409);
      p.videoId=videoId;p.state='processing';p.errorCode=undefined;p.processingStartedAt=new Date().toISOString();p.nextPollAt=undefined;p.dispatch++;
      job.status='WAITING';job.statusNote='YOUTUBE:PROCESSING';job.instructions=JSON.stringify(p);return repo.save(job);
    });
    await this.delivery.enqueue(`reconcile-${job.id}-${payloadOf(job).dispatch}`);return view(job);
  }
  private async save(job:AutomationJob,p:UploadPayload){job.instructions=JSON.stringify(p);job.statusNote=`YOUTUBE:${p.state.toUpperCase()}`;job.status=p.state==='completed'?'COMPLETED':['failed','needs-review'].includes(p.state)?'WAITING':'IN_PROGRESS';if(p.state==='completed')job.completedAt=new Date();await this.db.getRepository(AutomationJob).save(job);}
  private async schedule(job:AutomationJob,p:UploadPayload,delay=0){p.dispatch++;await this.save(job,p);await this.delivery.enqueue(`pump-${job.id}-${p.dispatch}`,delay);}
  private async notice(job:AutomationJob,p:UploadPayload,complete:boolean){
    const id=idFor(`youtube-notice:${job.id}:${complete?'completed':p.state}`);
    const result=await this.db.transaction(async manager=>{
      const repo=manager.getRepository<Notification>('Notification');
      const existing=await repo.findOneBy({id});if(existing)return null;
      const link=p.community?'https://community.neture.co.kr/communities/community/signage':'https://store.neture.co.kr/store/marketing/signage/videos';
      return repo.save(repo.create({id,userId:p.actorId,type:'custom',channel:'in_app',serviceKey:p.serviceKey,organizationId:p.organizationId,title:complete?'동영상 등록 완료':'동영상 등록 확인 필요',message:complete?`“${p.name}” 영상이 YouTube 처리와 목록 등록을 마쳤습니다.`:`“${p.name}” 요청의 상태를 확인해 주세요.`,metadata:{youtubeUploadJobId:job.id,targetUrl:p.community?'/communities/community/signage':'/store/marketing/signage/videos',actionUrl:link,url:link,event:complete?'completed':p.state},isRead:false}));
    });
    if(result)notificationEventHub.emitNotification({id:result.id,userId:result.userId,type:result.type,title:result.title,message:result.message!,serviceKey:result.serviceKey,organizationId:result.organizationId,metadata:result.metadata,createdAt:result.createdAt});
  }
  private async finish(job:AutomationJob,p:UploadPayload,token:string){
    if(p.processingStartedAt&&Date.now()-Date.parse(p.processingStartedAt)>60*60*1000)throw new YoutubeError('YOUTUBE_PROCESSING_DELAY_REVIEW');
    if(!await this.client.ready(token,p.videoId!)){p.nextPollAt=new Date(Date.now()+30000).toISOString();await this.schedule(job,p,30);return;}
    await this.authorized(p);
    const media=await registerVideo(this.db,{actorId:p.actorId,serviceKey:p.serviceKey,organizationId:p.organizationId,community:p.community},{requestId:job.id,name:p.name,description:p.description,tags:p.tags,sourceUrl:`https://www.youtube.com/watch?v=${p.videoId}`});
    p.mediaId=media.id;await this.notice(job,p,true);p.notified=true;p.state='completed';await this.save(job,p);
    // A queued task is only a wake-up hint; selection is always the oldest channel request.
    await this.delivery.enqueue(`next-${job.id}`);
  }
  async step(){
    const runner=this.db.createQueryRunner();await runner.connect();let locked=false;
    try{
      const [lock]=await runner.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked',[`youtube-channel:${YOUTUBE_CHANNEL_ID}`]);locked=lock.locked===true;if(!locked)throw new YoutubeError('YOUTUBE_CHANNEL_BUSY');
      const [head]=await runner.query(`SELECT id FROM automation_jobs WHERE type='VIDEO' AND status IN ('WAITING','IN_PROGRESS') AND status_note=ANY($1::varchar[]) ORDER BY created_at,id LIMIT 1`,[YOUTUBE_ACTIVE_NOTES]);
      if(!head)return;
      const job=await this.db.getRepository(AutomationJob).findOneByOrFail({id:head.id});
      let p:UploadPayload;try{p=payloadOf(job);}catch{job.status='WAITING';job.statusNote='YOUTUBE:NEEDS-REVIEW';await this.db.getRepository(AutomationJob).save(job);await this.delivery.enqueue(`after-invalid-${job.id}`);return;}
      try{
        await this.authorized(p);
        if(p.nextPollAt&&Date.parse(p.nextPollAt)>Date.now()){await this.schedule(job,p,Math.ceil((Date.parse(p.nextPollAt)-Date.now())/1000));return;}
        const token=await this.connection.accessToken();
        if(p.state==='processing'){await this.finish(job,p,token);return;}
        const asset=await this.db.transaction(manager=>lockStoredVideo(manager,p.assetId,p.actorId));
        if(!p.sessionCipher){
          const session=await this.client.start(token,{name:p.name,description:p.description,tags:p.tags,mimeType:asset.mimeType,size:Number(asset.fileSize)});
          p.sessionCipher=encrypt(session);p.state='uploading';await this.schedule(job,p);return;
        }
        let session:string;try{session=decrypt(p.sessionCipher);}catch{throw new YoutubeError('YOUTUBE_RESULT_UNCERTAIN');}
        const position=await this.client.probe(token,session,Number(asset.fileSize));
        if(position.videoId)p.videoId=position.videoId;
        else{
          if(position.offset===Number(asset.fileSize))throw new YoutubeError('YOUTUBE_RESULT_UNCERTAIN');
          const stream=this.storage.bucket(process.env.GCS_MEDIA_LIBRARY_BUCKET||'o4o-media-library').file(asset.gcsPath!).createReadStream({start:position.offset});
          try{p.videoId=await this.client.upload(token,session,{mimeType:asset.mimeType,size:Number(asset.fileSize),offset:position.offset,stream});}finally{stream.destroy();}
        }
        p.state='processing';p.processingStartedAt??=new Date().toISOString();p.nextPollAt=new Date(Date.now()+30000).toISOString();await this.schedule(job,p,30);
      }catch(error){
        if(p.state==='completed')throw error;
        p.errorCode=error instanceof YoutubeError?error.code:'YOUTUBE_WORKER_FAILED';
        if(['YOUTUBE_RECONNECT_REQUIRED','YOUTUBE_NOT_CONNECTED','YOUTUBE_OAUTH_NOT_CONFIGURED'].includes(p.errorCode)){if(p.errorCode==='YOUTUBE_RECONNECT_REQUIRED')await this.connection.invalidate();job.status='WAITING';job.statusNote='YOUTUBE:RETRY';job.instructions=JSON.stringify(p);await this.db.getRepository(AutomationJob).save(job);throw new YoutubeError(p.errorCode);}
        p.attempts++;
        const review=['YOUTUBE_RESULT_UNCERTAIN','YOUTUBE_SHARING_REVIEW_REQUIRED','YOUTUBE_PROCESSING_DELAY_REVIEW'].includes(p.errorCode);
        if(review||p.attempts>=5||['YOUTUBE_CHANNEL_MISMATCH','YOUTUBE_REQUEST_ACCESS_REVOKED'].includes(p.errorCode)){
          p.state=review?'needs-review':'failed';await this.save(job,p);await this.notice(job,p,false);await this.delivery.enqueue(`after-failure-${job.id}`);return;
        }
        // Preserve the session on every retry; never start a second upload after ambiguous bytes.
        job.statusNote='YOUTUBE:RETRY';job.instructions=JSON.stringify(p);await this.db.getRepository(AutomationJob).save(job);throw new YoutubeError(p.errorCode);
      }
    }finally{if(locked)await runner.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[`youtube-channel:${YOUTUBE_CHANNEL_ID}`]).catch(()=>undefined);await runner.release();}
  }
}

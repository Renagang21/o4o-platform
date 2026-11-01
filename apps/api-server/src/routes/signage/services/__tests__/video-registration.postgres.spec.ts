jest.mock('@o4o/asset-copy-core', () => jest.requireActual('../../../../../../../packages/asset-copy-core/src/index.ts'), { virtual: true });
import { Readable } from 'node:stream';
import { randomBytes } from 'node:crypto';
import { AssetSnapshot } from '@o4o/asset-copy-core';
import { AutomationJob } from '../../../../modules/automation/entities/AutomationJob.entity.js';
import { MediaAsset } from '../../../../modules/media/entities/MediaAsset.entity.js';
import { YoutubeUploadQueue } from '../../../../modules/youtube/upload-queue.service.js';
import { copyCommunityVideoOnce } from '../../../../services/community/community-video-copy.service.js';
import 'reflect-metadata';
import { DataSource, EntitySchema } from 'typeorm';
import { registerVideo } from '../video-registration.service.js';
const url=process.env.O4O_VIDEO_TEST_PG_URL;
const pg=url?describe:describe.skip;
pg('isolated PostgreSQL video registration concurrency',()=>{
  let db:DataSource;
  const scope={actorId:'actor-a',serviceKey:'kpa-society',organizationId:'store-a'};
  const input={requestId:'90000000-0000-4000-a000-000000000001',name:'Synthetic video',sourceUrl:'https://youtu.be/abcdefghijk'};
  beforeAll(async()=>{
    const parsed=new URL(url!);if(!['127.0.0.1','localhost'].includes(parsed.hostname)||parsed.pathname!=='/o4o_video_test')throw new Error('Isolated local test database required');
    const entity=new EntitySchema({name:'SignageMedia',tableName:'signage_media',columns:{
      id:{type:'uuid',primary:true},name:{type:String},description:{type:String,nullable:true},tags:{type:'text',array:true,default:'{}'},
      mediaType:{type:String},sourceType:{type:String},sourceUrl:{type:String},embedId:{type:String,nullable:true},thumbnailUrl:{type:String,nullable:true},mimeType:{type:String,nullable:true},fileSize:{type:Number,nullable:true},
      serviceKey:{type:String},organizationId:{type:String,nullable:true},source:{type:String},scope:{type:String},createdByUserId:{type:String},status:{type:String},metadata:{type:'jsonb',default:{}},
      createdAt:{type:Date,createDate:true},updatedAt:{type:Date,updateDate:true},deletedAt:{type:Date,deleteDate:true,nullable:true},
    }});
    const notification=new EntitySchema({name:'Notification',tableName:'notifications',columns:{id:{type:'uuid',primary:true},userId:{type:'uuid'},type:{type:String},channel:{type:String},serviceKey:{type:String,nullable:true},organizationId:{type:'uuid',nullable:true},title:{type:String},message:{type:String,nullable:true},metadata:{type:'jsonb'},isRead:{type:Boolean,default:false},createdAt:{type:Date,createDate:true},updatedAt:{type:Date,updateDate:true}}});
    db=new DataSource({type:'postgres',url,entities:[entity,AutomationJob,MediaAsset,AssetSnapshot,notification],synchronize:true,dropSchema:true});await db.initialize();
    await db.query(`CREATE TABLE media_entity_links(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,media_asset_id uuid REFERENCES media_assets(id),entity_type text,entity_id text,purpose text,UNIQUE(media_asset_id,entity_type,entity_id,purpose))`);
  });
  afterAll(async()=>{if(db?.isInitialized)await db.destroy();});
  beforeEach(async()=>{await db.query('TRUNCATE signage_media,automation_jobs,media_assets,notifications,o4o_asset_snapshots,media_entity_links CASCADE');});
  it('commits one row for twelve concurrent duplicate requests',async()=>{
    const results=await Promise.all(Array.from({length:12},()=>registerVideo(db,scope,input)));
    expect(new Set(results.map(row=>row.id)).size).toBe(1);
    expect((await db.query('SELECT COUNT(*)::int AS count FROM signage_media'))[0].count).toBe(1);
  });
  it('serializes conflicting request content and rolls back the rejected write',async()=>{
    const results=await Promise.allSettled([registerVideo(db,scope,input),registerVideo(db,scope,{...input,name:'Other title'})]);
    expect(results.filter(row=>row.status==='fulfilled')).toHaveLength(1);
    expect((results.find(row=>row.status==='rejected') as PromiseRejectedResult).reason.statusCode).toBe(409);
    expect((await db.query('SELECT COUNT(*)::int AS count FROM signage_media'))[0].count).toBe(1);
  });
  it('isolates the same client request ID by store and actor',async()=>{
    const rows=await Promise.all([registerVideo(db,scope,input),registerVideo(db,{...scope,organizationId:'store-b'},input),registerVideo(db,{...scope,actorId:'actor-b'},input)]);
    expect(new Set(rows.map(row=>row.id)).size).toBe(3);
  });
  it('reuses one transactional Core snapshot for concurrent retries, while retaining community provenance',async()=>{
    const actor='90000000-0000-4000-a000-000000000021',org='90000000-0000-4000-a000-000000000022';
    const media=await registerVideo(db,{actorId:actor,serviceKey:'community',community:true},input);
    const request={requestId:input.requestId,sourceAssetId:media.id,assetType:'signage'};
    const copies=await Promise.all(Array.from({length:6},()=>copyCommunityVideoOnce(db,actor,org,request)));
    expect(new Set(copies.map(row=>row.id)).size).toBe(1);
    const [row]=await db.query('SELECT source_service,content_json FROM o4o_asset_snapshots');
    expect(row.source_service).toBe('community');expect(row.content_json.sourceUrl).toBe('https://www.youtube.com/watch?v=abcdefghijk');
  });
  it('serializes competing workers, completes the first job before the next and notifies once after registration',async()=>{
    const actor='90000000-0000-4000-a000-000000000031',assetId='90000000-0000-4000-a000-000000000032';
    process.env.ENCRYPTION_KEY=randomBytes(32).toString('hex');process.env.GOOGLE_CLOUD_PROJECT='synthetic-project';process.env.YOUTUBE_TASKS_REGION='synthetic-region';process.env.YOUTUBE_TASKS_QUEUE='synthetic-queue';process.env.YOUTUBE_TASKS_SERVICE_ACCOUNT='worker@synthetic-project.iam.gserviceaccount.com';
    await db.getRepository(MediaAsset).save(db.getRepository(MediaAsset).create({id:assetId,fileName:'fixture.mp4',originalName:'fixture.mp4',url:'https://storage.example.test/fixture.mp4',gcsPath:'fixture.mp4',mimeType:'video/mp4',fileSize:4,assetType:'video',uploadedBy:actor,isLibraryPublic:true,consentedAt:new Date(),folder:'general'}));
    const delivery={enqueue:jest.fn().mockResolvedValue(undefined)},connection={status:async()=>({connected:true}),accessToken:async()=> 'synthetic'};
    let release!:()=>void;const started=new Promise<void>(resolve=>{release=resolve;});
    const client={start:jest.fn(async()=>{await started;return 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=synthetic';}),probe:jest.fn(async()=>({offset:0})),upload:jest.fn(async()=> 'abcdefghijk'),ready:jest.fn(async()=>true)};
    const storage={bucket:()=>({file:()=>({createReadStream:()=>Readable.from([Buffer.from([0,1,2,3])])})})};
    const queue=new YoutubeUploadQueue(db,connection as any,delivery as any,client as any,storage as any,async()=>undefined);
    const scope={actorId:actor,serviceKey:'community',community:true};
    const body={...input,mediaLibraryAssetId:assetId,description:'Synthetic video',tags:['fixture']};
    const first=await queue.enqueue(scope,body);const duplicate=await queue.enqueue(scope,body);expect(first.id).toBe(duplicate.id);
    await queue.enqueue(scope,{...body,requestId:'90000000-0000-4000-a000-000000000002',name:'Second video'});
    const cancelledBody={...body,requestId:'90000000-0000-4000-a000-000000000003',name:'Cancelled video'};
    const cancelled=await queue.enqueue(scope,cancelledBody);
    await expect(queue.cancel('90000000-0000-4000-a000-000000000099',cancelled.id)).rejects.toMatchObject({code:'YOUTUBE_JOB_NOT_FOUND'});
    expect((await queue.cancel(actor,cancelled.id)).state).toBe('cancelled');
    await expect(queue.retry(actor,cancelled.id)).rejects.toMatchObject({code:'YOUTUBE_REQUEST_CANCELLED'});
    await expect(queue.enqueue(scope,cancelledBody)).rejects.toMatchObject({code:'YOUTUBE_REQUEST_CANCELLED'});
    const pending=queue.step();
    for(let i=0;i<100&&!client.start.mock.calls.length;i++)await new Promise(resolve=>setTimeout(resolve,5));
    await expect(queue.step()).rejects.toMatchObject({code:'YOUTUBE_CHANNEL_BUSY'});expect(client.start).toHaveBeenCalledTimes(1);release();await pending;
    await expect(queue.cancel(actor,first.id)).rejects.toMatchObject({code:'YOUTUBE_UPLOAD_ALREADY_STARTED'});
    await queue.step(); // acknowledged bytes -> processing
    await db.query(`UPDATE automation_jobs SET instructions=(instructions::jsonb-'nextPollAt')::text WHERE id=$1`,[first.id]);
    await queue.step(); // processing verified -> actual catalog -> notification
    expect(client.start).toHaveBeenCalledTimes(1);
    const [registered]=await db.query('SELECT COUNT(*)::int AS count FROM signage_media');expect(registered.count).toBe(1);
    const notices=await db.query('SELECT "userId",title,metadata FROM notifications');expect(notices).toHaveLength(1);expect(notices[0].userId).toBe(actor);expect(notices[0].metadata.event).toBe('completed');
    const state=await queue.list(actor);expect(state.find(row=>row.id===first.id)?.state).toBe('completed');
    const confirmed=await queue.enqueue(scope,body);expect(confirmed.queued).toBe(false);expect((await db.query('SELECT COUNT(*)::int AS count FROM notifications'))[0].count).toBe(1);
    await queue.step();expect(client.start).toHaveBeenCalledTimes(2); // only now may the next request start
  });

});

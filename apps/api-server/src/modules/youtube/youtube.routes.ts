import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';
import { requireMediaPlatformAdmin } from '../media/controllers/media-catalog.controller.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import { YoutubeUploadQueue } from './upload-queue.service.js';
import { YoutubeConnectionService } from './connection.service.js';
import { verifyYoutubeWorker } from './task-delivery.js';
import { YoutubeError } from './contracts.js';
import type { AuthRequest } from '../../types/auth.js';
const actor=(req:unknown)=>(req as AuthRequest).user!.id;
export function createYoutubeRouter(db:DataSource){
  const router=Router(),queue=new YoutubeUploadQueue(db),connection=new YoutubeConnectionService(db);
  const run=(fn:(req:AuthRequest)=>Promise<unknown>,status=200)=>asyncHandler(async(req,res)=>{
    try{res.set('Cache-Control','no-store').status(status).json({success:true,data:await fn(req as AuthRequest)});}
    catch(error){if(!(error instanceof YoutubeError))throw error;res.status(error.statusCode).json({success:false,code:error.code,error:'YouTube 요청 상태를 확인해 주세요. 연결·전달 설정이 없으면 업로드되지 않습니다.'});}
  });
  router.get('/youtube/uploads',apiLimiter,authenticate,run(async req=>({availability:await queue.availability(),items:await queue.list(actor(req))})));
  router.post('/youtube/uploads/:id/cancel',apiLimiter,authenticate,run(req=>queue.cancel(actor(req),req.params.id)));
  router.post('/youtube/uploads/:id/retry',apiLimiter,authenticate,run(req=>queue.retry(actor(req),req.params.id),202));
  router.post('/youtube/worker',asyncHandler(async(req,res)=>{
    if(!await verifyYoutubeWorker(req.headers.authorization)){res.status(401).json({success:false,code:'YOUTUBE_WORKER_AUTH_REQUIRED'});return;}
    try{await queue.step();res.status(204).end();}catch{res.status(503).json({success:false,code:'YOUTUBE_WORKER_RETRY'});}
  }));
  const admin=[apiLimiter,authenticate,requireAdmin,requireMediaPlatformAdmin];
  router.get('/platform/youtube',admin,run(async()=>({connection:await connection.status(),delivery:await queue.availability()})));
  router.get('/platform/youtube/requests',admin,run(()=>queue.listForAdmin()));
  router.post('/platform/youtube/requests/:id/retry',admin,run(req=>queue.retryForAdmin(req.params.id),202));
  router.post('/platform/youtube/requests/:id/reconcile',admin,run(req=>queue.reconcile(req.params.id,req.body?.videoId),202));
  router.post('/platform/youtube/resume',admin,run(()=>queue.resume(),202));
  router.post('/platform/youtube/connect',admin,run(req=>connection.begin(actor(req))));
  router.post('/platform/youtube/complete',admin,run(req=>connection.complete(actor(req),req.body??{})));
  return router;
}

import { CommunitySignageResolver } from '../modules/asset-snapshot/resolvers/community-signage.resolver.js';
import { Router, type Request, type RequestHandler } from 'express';
import { AppDataSource } from '../database/connection.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import type { AuthRequest } from '../types/auth.js';
import type { CommunityAccessUser } from '../utils/community-access.resolver.js';
import { resolveCommunityWorkspace } from '../services/community/community-workspace.service.js';
import { registerVideo } from './signage/services/video-registration.service.js';

export function createCommunitySignageRoutes(optionalAuth: RequestHandler, authenticate: RequestHandler, resolveUser: (req: Request) => Promise<CommunityAccessUser | null>) {
  const router = Router();
  const access: RequestHandler = asyncHandler(async (req, res, next) => {
    const workspace = await resolveCommunityWorkspace(AppDataSource, await resolveUser(req), 'community');
    if (!workspace?.allowed) { res.status(403).json({ success:false, code:'COMMUNITY_ACCESS_REQUIRED', error:'커뮤니티 이용 상태를 확인해 주세요.' }); return; }
    next();
  });
  router.get('/community/signage', apiLimiter, optionalAuth, asyncHandler(async (req, res) => {
    const user = await resolveUser(req);
    const workspace = await resolveCommunityWorkspace(AppDataSource, user, 'community');
    if (user && !workspace?.allowed) { res.status(403).json({success:false,error:'커뮤니티 이용 상태를 확인해 주세요.'}); return; }
    const page = typeof req.query.page === 'string' && /^\d{1,4}$/.test(req.query.page) ? Math.max(1,Number(req.query.page)) : 1;
    const items = await AppDataSource.query(`SELECT id,name,description,"sourceType","sourceUrl","thumbnailUrl",tags,"createdAt" FROM signage_media
      WHERE "serviceKey"='community' AND source='community' AND scope='global' AND status='active' AND "deletedAt" IS NULL
      ORDER BY "createdAt" DESC,id DESC LIMIT 25 OFFSET $1`, [(page-1)*24]);
    res.set('Cache-Control','no-store').json({success:true,data:{items:items.slice(0,24),hasNext:items.length>24,canRegister:workspace?.allowed===true}});
  }));
  router.get('/community/signage/:id', apiLimiter, authenticate, access, asyncHandler(async (req,res) => {
    const data = await new CommunitySignageResolver(AppDataSource).resolve(req.params.id, 'signage');
    if (!data) { res.status(404).json({success:false,error:'사용할 수 있는 영상을 찾지 못했습니다.'}); return; }
    res.set('Cache-Control','no-store').json({success:true,data});
  }));
  router.post('/community/signage', apiLimiter, authenticate, access, asyncHandler(async (req,res) => {
    const actorId = (req as AuthRequest).user!.id;
    const data = await registerVideo(AppDataSource,{serviceKey:'community',actorId,community:true},req.body);
    res.set('Cache-Control','no-store').status(201).json({success:true,data});
  }));
  router.post('/community/signage/youtube-jobs', apiLimiter, authenticate, access, asyncHandler(async(req,res)=>{
    const {YoutubeUploadQueue}=await import('../modules/youtube/upload-queue.service.js');
    const data=await new YoutubeUploadQueue(AppDataSource).enqueue({serviceKey:'community',community:true,actorId:(req as AuthRequest).user!.id},req.body);
    res.status(202).json({success:true,data});
  }));
  router.post('/community/signage/assets/copy', apiLimiter, authenticate, access, asyncHandler(async (req,res) => {
    const [{AssetCopyService},{resolveKpaContentOrganization},{readPreferredStoreOrganizationId},{copyCommunityVideoOnce}] = await Promise.all([
      import('@o4o/asset-copy-core'), import('./o4o-store/controllers/kpa-content-organization.js'), import('../utils/store-organization.resolver.js'), import('../services/community/community-video-copy.service.js'),
    ]);
    const user=(req as AuthRequest).user!;
    if(!new AssetCopyService(AppDataSource).checkPermission(user.roles??[],['kpa:admin','kpa:operator','kpa:store_owner','neture:store_owner','kpa:store_member'])) { res.status(403).json({success:false,error:'내 매장 이용 권한을 확인해 주세요.'});return; }
    const selected=readPreferredStoreOrganizationId(req);
    const organizationId=selected?await resolveKpaContentOrganization(AppDataSource,user.id,selected):null;
    if(!organizationId){res.status(403).json({success:false,error:'가져올 매장을 선택하고 이용 상태를 확인해 주세요.'});return;}
    const data=await copyCommunityVideoOnce(AppDataSource,user.id,organizationId,req.body??{});
    res.status(201).json({success:true,data});
  }));
  return router;
}

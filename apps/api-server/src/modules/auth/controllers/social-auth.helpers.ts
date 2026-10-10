import type { Request, Response } from 'express';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { resolveSessionServiceKey, ADMIN_SURFACE_KEY } from '../../../utils/session-origin.js';
import { extractToken } from '../../../common/middleware/auth/auth-context.helpers.js';
import { verifyAccessToken } from '../../../utils/token.utils.js';
import { socialCookieName } from '../../../services/auth/social-flow.service.js';
import type { SocialLinkContext } from '../../../services/auth/social-link.service.js';
import { invalidSocialFlow, SocialAuthError } from '../../../services/auth/social-auth-error.js';

export function socialOrigin(req: Request): {origin:string;serviceKey:string} {
  const origin=req.get('origin') ?? '';
  let parsed: URL;
  try { parsed=new URL(origin); } catch { throw invalidSocialFlow(); }
  let serviceKey=resolveSessionServiceKey(origin);
  if(process.env.NODE_ENV!=='production' && parsed.protocol==='http:' && ['localhost','127.0.0.1'].includes(parsed.hostname))serviceKey='neture';
  if(parsed.origin!==origin || parsed.username || parsed.password || !serviceKey || serviceKey===ADMIN_SURFACE_KEY ||
     (parsed.protocol!=='https:'&&process.env.NODE_ENV==='production')) {
    throw new SocialAuthError('SOCIAL_ORIGIN_NOT_ALLOWED','이 화면에서는 소셜 인증을 시작할 수 없습니다.',403);
  }
  return {origin,serviceKey};
}
export function socialOwner(req: AuthRequest): SocialLinkContext {
  const token=extractToken(req);const payload=token?verifyAccessToken(token):null;
  const origin=socialOrigin(req);
  if(!req.user?.id || payload?.userId!==req.user.id || !payload.sessionId || !payload.tokenFamily ||
    payload.serviceKey!==origin.serviceKey)throw invalidSocialFlow();
  return {...origin,userId:req.user.id,sessionId:payload.sessionId,tokenFamily:payload.tokenFamily};
}
export function safeSocialReturnTo(value: unknown): string {
  if(value===undefined)return '/';
  if(typeof value!=='string'||value.length>2048)throw invalidSocialFlow();
  let decoded: string;
  try {decoded=decodeURIComponent(value);}catch{throw invalidSocialFlow();}
  if(!decoded.startsWith('/')||decoded.startsWith('//')||decoded.includes('\\')||Array.from(decoded).some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127))throw invalidSocialFlow();
  return value;
}
const cookieOptions=()=>({httpOnly:true,secure:process.env.NODE_ENV==='production',// Match the existing production credential cookie contract for maintained cross-site legacy origins.
  sameSite:process.env.NODE_ENV==='production'?'none' as const:'lax' as const,
  path:'/api/v1/auth/social',maxAge:5*60*1000});
export function setSocialBinding(res:Response,grant:{token:string;binding:string}):void {
  res.cookie(socialCookieName(grant.token),grant.binding,cookieOptions());
}
export function clearSocialBinding(res:Response,token:string):void {
  const {maxAge,...options}=cookieOptions();void maxAge;
  res.clearCookie(socialCookieName(token),options);
}
export function socialBinding(req:Request,token:string):string {
  const value=req.cookies?.[socialCookieName(token)];return typeof value==='string'?value:'';
}

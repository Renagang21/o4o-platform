import type { Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { BaseController } from '../../../common/base.controller.js';
import { loadKakaoIdentityConfig } from '../../../config/kakao-identity.config.js';
import { googleIdentityConfig } from '../../../config/google-identity.config.js';
import { kakaoIdentityService } from '../../../services/auth/kakao-identity.service.js';
import { kakaoAuthService } from '../../../services/auth/kakao-auth.service.js';
import { socialLinkService } from '../../../services/auth/social-link.service.js';
import { socialFlowService,socialDigest } from '../../../services/auth/social-flow.service.js';
import { GoogleIdTokenError } from '../../../services/auth/google-identity.service.js';
import { invalidSocialFlow,SocialAuthError } from '../../../services/auth/social-auth-error.js';
import { GoogleAuthController } from './google-auth.controller.js';
import { socialOrigin,socialOwner,safeSocialReturnTo,setSocialBinding,clearSocialBinding,socialBinding } from './social-auth.helpers.js';
import type { SocialProvider } from '../../../services/auth/social-flow.service.js';

export class SocialAuthController extends BaseController {
  private static async respond(res:Response,operation:()=>Promise<unknown>):Promise<unknown> {
    res.set('Cache-Control','no-store');
    try {return await operation();}catch(error){
      if(error instanceof SocialAuthError)return res.status(error.statusCode).json({success:false,error:error.message,code:error.code,...(error.serviceAccess?{serviceAccess:error.serviceAccess}:{})});
      if(error instanceof GoogleIdTokenError)return BaseController.unauthorized(res,'Google 인증을 다시 진행해 주세요.',error.code);
      // Never emit error messages/stacks from provider HTTP calls, queries or credential comparisons.
      return BaseController.error(res,'소셜 인증을 처리하지 못했습니다. 다시 시도해 주세요.',503,'SOCIAL_AUTH_FAILED');
    }
  }
  private static requireProvider(provider:SocialProvider):void {
    const enabled=provider==='kakao'?loadKakaoIdentityConfig().enabled:googleIdentityConfig.isConfigured();
    if(!enabled)throw new SocialAuthError('SOCIAL_PROVIDER_NOT_CONFIGURED','이 로그인 수단은 준비 중입니다.',503);
  }
  static async config(req:Request,res:Response) {
    res.set('Cache-Control','no-store');
    try {socialOrigin(req);return BaseController.ok(res,{enabled:loadKakaoIdentityConfig().enabled});}
    catch {return BaseController.ok(res,{enabled:false});}
  }
  static async startLogin(req:Request,res:Response) {
    return SocialAuthController.respond(res,async()=>{
      SocialAuthController.requireProvider('kakao');const {origin,serviceKey}=socialOrigin(req);
      const grant=await socialFlowService.create('kakao-login','kakao',origin,serviceKey,{returnTo:safeSocialReturnTo(req.body.returnTo)});
      setSocialBinding(res,grant);return BaseController.ok(res,{token:grant.token,authorizationUrl:kakaoIdentityService.authorizationUrl(grant.token)});
    });
  }
  /** GET is redirect-only: no code exchange, flow consumption, identity write or session issuance. */
  static async callback(req:Request,res:Response) {
    return SocialAuthController.respond(res,async()=>{
      const token=typeof req.query.state==='string'?req.query.state:'';
      const flow=await socialFlowService.read(token);
      if(flow.provider!=='kakao'||!['kakao-login','link-reauth','link-proof'].includes(flow.kind))throw invalidSocialFlow();
      const binding=Buffer.from(socialDigest(socialBinding(req,token)));const expected=Buffer.from(flow.binding_hash);
      if(binding.length!==expected.length||!timingSafeEqual(binding,expected))throw invalidSocialFlow();
      const code=typeof req.query.code==='string'&&req.query.code.length<=2048?req.query.code:'';
      const target=flow.kind==='kakao-login'?new URL('/login',flow.origin):new URL(safeSocialReturnTo(flow.payload.returnTo),flow.origin);
      if(flow.kind==='kakao-login')target.searchParams.set('returnTo',safeSocialReturnTo(flow.payload.returnTo));
      target.hash=new URLSearchParams({social_kind:flow.kind,token,...(code?{code}:{error:'cancelled'})}).toString();
      res.set('Referrer-Policy','no-referrer');return res.redirect(303,target.href);
    });
  }
  static async completeLogin(req:Request,res:Response) {
    return SocialAuthController.respond(res,async()=>{
      const {origin}=socialOrigin(req);const result=await kakaoAuthService.login(req.body.token,socialBinding(req,req.body.token),origin,req.body.code??'');
      clearSocialBinding(res,req.body.token);
      if('nextStep'in result){
        if('grant' in result && result.nextStep==='signup'){setSocialBinding(res,result.grant);return BaseController.ok(res,{nextStep:result.nextStep,signupTicket:result.grant.token,email:result.email});}
        return BaseController.ok(res,result);
      }
      return GoogleAuthController.respondWithSession(req,res,result,req.body.includeLegacyTokens,'Login successful');
    });
  }
  static async signup(req:Request,res:Response) {
    return SocialAuthController.respond(res,async()=>{
      const {origin}=socialOrigin(req);const result=await kakaoAuthService.signup(req.body.token,socialBinding(req,req.body.token),origin,req.body);
      clearSocialBinding(res,req.body.token);
      return 'nextStep'in result?BaseController.ok(res,result):GoogleAuthController.respondWithSession(req,res,result,req.body.includeLegacyTokens,'Signup successful',201);
    });
  }
  static async accounts(req:AuthRequest,res:Response) {
    return SocialAuthController.respond(res,async()=>{const owner=socialOwner(req);return BaseController.ok(res,{...await socialLinkService.status(owner.userId),kakaoEnabled:loadKakaoIdentityConfig().enabled,googleEnabled:googleIdentityConfig.isConfigured()});});
  }
  static async reauthenticatePassword(req:AuthRequest,res:Response) {
    return SocialAuthController.respond(res,async()=>{const grant=await socialLinkService.reauthenticatePassword(socialOwner(req),req.body.password);setSocialBinding(res,grant);return BaseController.ok(res,{token:grant.token});});
  }
  static async startReauthentication(req:AuthRequest,res:Response) {
    return SocialAuthController.respond(res,async()=>{
      SocialAuthController.requireProvider(req.body.provider);const owner=socialOwner(req);
      const grant=await socialLinkService.startReauthentication(owner,req.body.provider,safeSocialReturnTo(req.body.returnTo));
      setSocialBinding(res,grant);return BaseController.ok(res,{token:grant.token,nonce:grant.nonce,...(req.body.provider==='kakao'?{authorizationUrl:kakaoIdentityService.authorizationUrl(grant.token,true)}:{})});
    });
  }
  static async completeReauthentication(req:AuthRequest,res:Response) {
    return SocialAuthController.respond(res,async()=>{const grant=await socialLinkService.completeReauthentication(socialOwner(req),req.body.token,socialBinding(req,req.body.token),req.body);clearSocialBinding(res,req.body.token);setSocialBinding(res,grant);return BaseController.ok(res,{token:grant.token});});
  }
  static async startLink(req:AuthRequest,res:Response) {
    return SocialAuthController.respond(res,async()=>{
      SocialAuthController.requireProvider(req.body.provider);const grant=await socialLinkService.startLink(socialOwner(req),req.body.token,socialBinding(req,req.body.token),req.body.provider,safeSocialReturnTo(req.body.returnTo));
      clearSocialBinding(res,req.body.token);setSocialBinding(res,grant);return BaseController.ok(res,{token:grant.token,nonce:grant.nonce,...(req.body.provider==='kakao'?{authorizationUrl:kakaoIdentityService.authorizationUrl(grant.token,true)}:{})});
    });
  }
  static async verifyLink(req:AuthRequest,res:Response) {
    return SocialAuthController.respond(res,async()=>{const grant=await socialLinkService.verifyTarget(socialOwner(req),req.body.token,socialBinding(req,req.body.token),req.body);clearSocialBinding(res,req.body.token);setSocialBinding(res,grant);return BaseController.ok(res,{token:grant.token,provider:grant.provider});});
  }
  static async confirmLink(req:AuthRequest,res:Response) {
    return SocialAuthController.respond(res,async()=>{const result=await socialLinkService.confirm(socialOwner(req),req.body.token,socialBinding(req,req.body.token),req.body.confirm);clearSocialBinding(res,req.body.token);return BaseController.ok(res,result);});
  }
}

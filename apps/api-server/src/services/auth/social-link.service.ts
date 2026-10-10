import { randomBytes } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { resolveAccountAccess } from '../../common/auth/account-access.policy.js';
import { isBrowserSessionLive } from './browser-session.service.js';
import { demoAccountService } from './demo-account.service.js';
import { passwordCredentialService } from './password-credential.service.js';
import { googleIdentityService } from './google-identity.service.js';
import { kakaoIdentityService } from './kakao-identity.service.js';
import { socialFlowService, type SocialFlow, type SocialFlowService, type SocialFlowOwner, type SocialProvider } from './social-flow.service.js';
import { invalidSocialFlow, SocialAuthError } from './social-auth-error.js';

interface IdentityLink { userId: string; providerId: string; provider: SocialProvider }
export interface SocialLinkContext extends SocialFlowOwner { origin: string; serviceKey: string }
export interface SocialProviderProof { idToken?: string; code?: string }
type LinkDatabase = Pick<DataSource,'query'|'transaction'>;
export interface SocialLinkDependencies {
  db?: LinkDatabase; flows?: SocialFlowService;
  password?: typeof passwordCredentialService;
  google?: Pick<typeof googleIdentityService,'verifyGoogleIdToken'>;
  kakao?: Pick<typeof kakaoIdentityService,'exchangeCode'>;
}

/** Reauthenticate current owner -> verify target identity -> explicit confirmation. No session issuer. */
export class SocialLinkService {
  private readonly db: LinkDatabase;
  private readonly flows: SocialFlowService;
  private readonly passwords: typeof passwordCredentialService;
  private readonly google: Pick<typeof googleIdentityService,'verifyGoogleIdToken'>;
  private readonly kakao: Pick<typeof kakaoIdentityService,'exchangeCode'>;
  constructor(deps: SocialLinkDependencies = {}) {
    this.db=deps.db??AppDataSource;this.flows=deps.flows??socialFlowService;
    this.passwords=deps.password??passwordCredentialService;this.google=deps.google??googleIdentityService;this.kakao=deps.kakao??kakaoIdentityService;
  }

  async status(userId: string) {
    const links: Array<{provider: SocialProvider}> = await this.db.query(
      `SELECT provider FROM linked_accounts WHERE "userId"=$1 AND provider IN ('google','kakao')`,[userId]);
    const demo=await demoAccountService.isDemoAccount(userId,this.db);
    return {providers:links.map(x=>x.provider),hasPassword:await this.passwords.hasPassword(userId,this.db),canManage:!demo};
  }

  private async lockOwner(context: SocialLinkContext, manager: EntityManager): Promise<void> {
    const rows: Array<{refreshTokenFamily: string;isActive:boolean;status:string}> = await manager.query(
      `SELECT "refreshTokenFamily","isActive",status FROM users WHERE id=$1 FOR UPDATE`,[context.userId]);
    const user=rows[0];
    if (!user?.isActive || resolveAccountAccess(user.status)==='blocked' || user.refreshTokenFamily!==context.tokenFamily ||
        !(await isBrowserSessionLive(context.userId,{serviceKey:context.serviceKey,sessionId:context.sessionId,tokenFamily:context.tokenFamily},user.refreshTokenFamily,manager))) throw invalidSocialFlow();
    if(await demoAccountService.isDemoAccount(context.userId,manager)) throw new SocialAuthError('DEMO_ACCOUNT_FORBIDDEN','테스트 계정의 인증 수단은 변경할 수 없습니다.',403);
  }

  async reauthenticatePassword(context: SocialLinkContext, password: string) {
    return this.db.transaction(async manager=>{
      await this.lockOwner(context,manager);
      if (!(await this.passwords.verifyPassword(context.userId,password,manager))) throw new SocialAuthError('CURRENT_PASSWORD_MISMATCH','현재 비밀번호를 확인해 주세요.',401);
      return this.flows.create('link-permit','google',context.origin,context.serviceKey,{method:'password'},context,manager);
    });
  }

  async startReauthentication(context: SocialLinkContext, provider: SocialProvider, returnTo: string) {
    return this.db.transaction(async manager=>{
      await this.lockOwner(context,manager);
      const links: IdentityLink[]=await manager.query(`SELECT "userId","providerId",provider FROM linked_accounts WHERE "userId"=$1 AND provider=$2`,[context.userId,provider]);
      if(!links[0]?.providerId)throw new SocialAuthError('REAUTH_METHOD_NOT_LINKED','현재 계정에 연결된 로그인 수단으로 다시 인증해 주세요.',403);
      const nonce=randomBytes(32).toString('base64url');
      return {...await this.flows.create('link-reauth',provider,context.origin,context.serviceKey,{nonce,returnTo},context,manager),nonce};
    });
  }

  async completeReauthentication(context: SocialLinkContext, token: string, binding: string, proof: SocialProviderProof) {
    // Burn the challenge before external exchange; invalid responses cannot reuse a valid code/state.
    const flow=await this.flows.consume(token,binding,'link-reauth',context.origin,context);
    const providerId=await this.proveIdentity(flow,proof);
    return this.db.transaction(async manager=>{
      await this.lockOwner(context,manager);
      const links: IdentityLink[]=await manager.query(`SELECT "userId","providerId",provider FROM linked_accounts WHERE "userId"=$1 AND provider=$2 AND "providerId"=$3`,[context.userId,flow.provider,providerId]);
      if(!links[0])throw new SocialAuthError('REAUTH_IDENTITY_MISMATCH','현재 O4O 계정에 연결된 소셜 계정을 선택해 주세요.',403);
      return this.flows.create('link-permit',flow.provider,context.origin,context.serviceKey,{method:flow.provider},context,manager);
    });
  }

  async startLink(context: SocialLinkContext, token: string, binding: string, provider: SocialProvider, returnTo: string) {
    return this.db.transaction(async manager=>{
      await this.lockOwner(context,manager);
      await this.flows.consume(token,binding,'link-permit',context.origin,context,manager);
      const nonce=randomBytes(32).toString('base64url');
      return {...await this.flows.create('link-proof',provider,context.origin,context.serviceKey,{nonce,returnTo},context,manager),nonce};
    });
  }

  async verifyTarget(context: SocialLinkContext, token: string, binding: string, proof: SocialProviderProof) {
    const flow=await this.flows.consume(token,binding,'link-proof',context.origin,context);
    const providerId=await this.proveIdentity(flow,proof);
    return this.db.transaction(async manager=>{
      await this.lockOwner(context,manager);
      await this.assertIdentityAvailable(manager,context.userId,flow.provider,providerId);
      return {...await this.flows.create('link-confirm',flow.provider,context.origin,context.serviceKey,{providerId},context,manager),provider:flow.provider};
    });
  }

  private async proveIdentity(flow: SocialFlow, proof: SocialProviderProof): Promise<string> {
    if(flow.provider==='kakao')return(await this.kakao.exchangeCode(proof.code??'')).providerId;
    if(typeof flow.payload.nonce!=='string' || !flow.payload.nonce)throw invalidSocialFlow();
    const identity=await this.google.verifyGoogleIdToken(proof.idToken??'',{nonce:flow.payload.nonce,issuedAfter:new Date(flow.created_at)});
    return identity.sub;
  }

  private async assertIdentityAvailable(manager: EntityManager, userId: string, provider: SocialProvider, providerId: string): Promise<void> {
    const links: IdentityLink[]=await manager.query(`SELECT "userId","providerId",provider FROM linked_accounts
      WHERE provider=$1 AND ("providerId"=$2 OR "userId"=$3)`,[provider,providerId,userId]);
    if(links.some(link=>link.userId!==userId || link.providerId!==providerId))throw new SocialAuthError('SOCIAL_IDENTITY_CONFLICT','이 소셜 계정은 다른 계정에 연결되어 있거나, 현재 계정에 다른 소셜 ID가 연결되어 있습니다. 자동 병합하지 않습니다.',409);
  }

  async confirm(context: SocialLinkContext, token: string, binding: string, confirmation: boolean) {
    if(confirmation!==true)throw new SocialAuthError('LINK_CONFIRMATION_REQUIRED','소셜 계정 연결을 확인해 주세요.');
    try {
      await this.db.transaction(async manager=>{
        await this.lockOwner(context,manager);
        const flow=await this.flows.consume(token,binding,'link-confirm',context.origin,context,manager);
        const providerId=flow.payload.providerId;
        if(typeof providerId!=='string'||!providerId)throw invalidSocialFlow();
        await this.assertIdentityAvailable(manager,context.userId,flow.provider,providerId);
        await manager.query(`INSERT INTO linked_accounts(id,"userId",provider,"providerId","linkedAt","createdAt","updatedAt")
          VALUES (gen_random_uuid(),$1,$2,$3,now(),now(),now()) ON CONFLICT DO NOTHING`,[context.userId,flow.provider,providerId]);
        // A concurrent identity attached to someone else must never be reported as success.
        const rows: IdentityLink[]=await manager.query(`SELECT "userId","providerId",provider FROM linked_accounts WHERE provider=$1 AND "providerId"=$2`,[flow.provider,providerId]);
        if(rows[0]?.userId!==context.userId)throw new SocialAuthError('SOCIAL_IDENTITY_CONFLICT','이미 다른 계정에 연결된 소셜 계정입니다.',409);
      });
      return {linked:true};
    } catch(error) {
      const e=error as{code?:string;driverError?:{code?:string}};
      if((e.code??e.driverError?.code)==='23505')throw new SocialAuthError('SOCIAL_IDENTITY_CONFLICT','소셜 계정 연결이 충돌했습니다. 다시 확인해 주세요.',409);
      throw error;
    }
  }
}
export const socialLinkService=new SocialLinkService();

import {initialMemberRegistration} from './new-member-registration.js';
import { recordSignupTerms, recordSignupPrivacy, resolveSignupPolicyServiceKey, type SignupTermsReference } from './signup-policy.service.js';
import type { DataSource } from 'typeorm';
import { normalizeLoginEmail, isLoginEmailShapeValid, maskLoginEmail } from '@o4o/auth-utils';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../entities/User.js';
import { LinkedAccount } from '../../entities/LinkedAccount.js';
import { UserStatus } from '../../types/auth.js';
import { defaultSemiFranchiseAccessResolver, evaluateServiceLoginAccess, resolveLoginMembershipGateKey, serviceNotMemberMessage } from '../../common/auth/service-login-eligibility.policy.js';
import { resolveAccountAccess } from '../../common/auth/account-access.policy.js';
import { isSessionAuthMethodAllowed } from '../../common/auth/password-session.policy.js';
import { demoAccountService } from './demo-account.service.js';
import { freshenUserContext, generateTokensWithContext, injectRolesIntoPublicData } from './auth-context.helper.js';
import { emailAuthService } from './email-auth.service.js';
import { kakaoIdentityService, type KakaoIdentityService, type VerifiedKakaoIdentity } from './kakao-identity.service.js';
import { socialFlowService, type SocialFlowService } from './social-flow.service.js';
import { SocialAuthError } from './social-auth-error.js';

/**
 * WO-O4O-SOCIAL-SIGNUP-DIRECT-ROLE-REGISTRATION-V1 S1 · Q1: 카카오 가입은 약관 동의만 받는다.
 * 이메일 · 이름 · 닉네임 · 휴대전화는 받지 않는다(예전 화면이 보내도 쓰지 않는다) — 닉네임 · 직역 정보는 가입 신청(역할 입력)에서 받는다.
 */
export interface KakaoSignupInput { email?: string; name?: string; nickname?: string; phone?: string; consents: { terms: boolean; privacy: boolean; marketing?: boolean; termsPolicy?: SignupTermsReference; privacyPolicy?: SignupTermsReference } }
const uniqueViolation = (error: unknown): boolean => {
  const e = error as { code?: string; driverError?: { code?: string } };
  return (e?.code ?? e?.driverError?.code) === '23505';
};

export class KakaoAuthService {
  constructor(private readonly db: Pick<DataSource,'getRepository'|'transaction'> = AppDataSource,
    private readonly identity: Pick<KakaoIdentityService,'exchangeCode'> = kakaoIdentityService,
    private readonly flows: SocialFlowService = socialFlowService) {}

  async login(token: string, binding: string, origin: string, code: string) {
    const flow = await this.flows.consume(token,binding,'kakao-login',origin);
    const identity = await this.identity.exchangeCode(code);
    const link = await this.db.getRepository(LinkedAccount).findOne({where:{provider:'kakao',providerId:identity.providerId}});
    if (!link) {
      const grant = await this.flows.create('kakao-signup','kakao',origin,flow.service_key,{...identity});
      return { nextStep:'signup' as const, grant, email:identity.email ?? '' };
    }
    const user = await this.db.getRepository(User).findOne({where:{id:link.userId}});
    if (!user) throw new SocialAuthError('INVALID_USER','계정을 확인할 수 없습니다.',401);
    return this.sessionOrVerification(user,flow.service_key,false,resolveLoginMembershipGateKey(origin));
  }

  async signup(token: string, binding: string, origin: string, input: KakaoSignupInput) {
    if (!input.consents?.terms || !input.consents?.privacy) throw new SocialAuthError('CONSENT_REQUIRED','이용약관과 개인정보 처리방침에 동의해 주시기 바랍니다.');
    let serviceKey='';
    try {
      const user=await this.db.transaction(async manager=>{
        const flow=await this.flows.consume(token,binding,'kakao-signup',origin,undefined,manager);serviceKey=flow.service_key;
        const identity=flow.payload as unknown as VerifiedKakaoIdentity;
        if (!identity.providerId) throw new SocialAuthError('SOCIAL_FLOW_INVALID','인증을 다시 시작해 주시기 바랍니다.',401);
        // Q2: 카카오가 확인한 이메일만 저장한다. 제공하지 않았거나 확인되지 않았으면 비워 둔다(S2 · S3 — 확인 메일 없음).
        const email=identity.emailVerified===true&&isLoginEmailShapeValid(identity.email)?normalizeLoginEmail(identity.email):null;
        if (email) {
          if (await demoAccountService.isDemoLoginEmail(email,manager)) throw new SocialAuthError('DEMO_ACCOUNT_FORBIDDEN','테스트 계정의 인증 수단은 변경할 수 없습니다.',403);
          // #987 U2: 같은 이메일의 기존 계정과 자동으로 합치지 않는다.
          const duplicate: unknown[] = await manager.query('SELECT 1 FROM users WHERE lower(email)=$1 LIMIT 1',[email]);
          if (duplicate.length) throw new SocialAuthError('EMAIL_IN_USE','이미 사용 중인 이메일입니다. 기존 계정으로 로그인한 뒤 명시적으로 연결해 주시기 바랍니다.',409);
        }
        const now=new Date();const repo=manager.getRepository(User);
        // 확인이 남은 이메일이 없다(카카오 확인 이메일이거나 이메일 없음) — 이메일 확인 관문을 두지 않는다.
        const created=repo.create({businessInfo:initialMemberRegistration(),email,name:null,
          status:UserStatus.ACTIVE,isActive:true,isEmailVerified:true,
          tosAcceptedAt:now,privacyAcceptedAt:now,marketingAccepted:input.consents.marketing===true});
        await repo.save(created);
        await manager.getRepository(LinkedAccount).save(manager.getRepository(LinkedAccount).create({
          userId:created.id,provider:'kakao',providerId:identity.providerId,linkedAt:now,lastUsedAt:now,
        }));
        const policyServiceKey = await resolveSignupPolicyServiceKey(flow.service_key, manager);
        await recordSignupTerms(created.id, policyServiceKey, input.consents.termsPolicy, manager);
        await recordSignupPrivacy(created.id, input.consents.privacyPolicy, manager, policyServiceKey);
        return created;
      });
      return this.sessionOrVerification(user,serviceKey,true);
    } catch(error) {
      if (uniqueViolation(error)) throw new SocialAuthError('SOCIAL_IDENTITY_CONFLICT','이미 등록된 이메일 또는 소셜 계정입니다. 기존 계정으로 로그인해 주시기 바랍니다.',409);
      throw error;
    }
  }

  private async sessionOrVerification(user: User, serviceKey: string, isNewUser: boolean, gateKey?: string | null) {
    if (!user.isActive || resolveAccountAccess(user.status)==='blocked') throw new SocialAuthError('ACCOUNT_NOT_ACTIVE','이용할 수 없는 계정입니다.',403);
    const context=await freshenUserContext(user.id);
    if (!isSessionAuthMethodAllowed('kakao',serviceKey,context.roles)) throw new SocialAuthError('GOOGLE_SESSION_REQUIRED','전체관리자 계정은 Google로 로그인해 주시기 바랍니다.',403);
    // 예전 카카오 가입은 이메일을 직접 입력받아 확인 메일로 확인했다 — 그 계정만 이 관문이 남는다. 이메일이 없으면 확인할 것이 없다.
    if (!user.isEmailVerified && normalizeLoginEmail(user.email)) {
      const mailSent=await emailAuthService.sendVerificationMail(user,serviceKey);
      return {nextStep:'verify-email' as const,maskedEmail:maskLoginEmail(user.email),mailSent};
    }
    const access = await evaluateServiceLoginAccess(defaultSemiFranchiseAccessResolver, user.id, gateKey, context.roles, context.memberships);
    if (!access.allowed) throw new SocialAuthError('SERVICE_NOT_MEMBER', serviceNotMemberMessage(access.serviceAccess), 403, access.serviceAccess);
    const {tokens}=await generateTokensWithContext(user,'neture.co.kr',serviceKey,'kakao',context);
    await this.db.getRepository(User).update({id:user.id},{lastLoginAt:new Date()});
    const publicData=user.toPublicData() as Record<string,unknown>;
    injectRolesIntoPublicData(publicData,context.roles,context.memberships);
    return {user:publicData,tokens,isNewUser};
  }
}
export const kakaoAuthService=new KakaoAuthService();

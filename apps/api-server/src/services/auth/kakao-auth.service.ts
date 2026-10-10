import { recordSignupTerms, signupPolicyServiceKey, type SignupTermsReference } from './signup-policy.service.js';
import type { DataSource } from 'typeorm';
import { normalizeLoginEmail, isLoginEmailShapeValid, maskLoginEmail } from '@o4o/auth-utils';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../entities/User.js';
import { LinkedAccount } from '../../entities/LinkedAccount.js';
import { UserStatus } from '../../types/auth.js';
import { defaultSemiFranchiseAccessResolver, evaluateServiceLoginAccess, resolveLoginMembershipGateKey, serviceNotMemberMessage } from '../../common/auth/service-login-eligibility.policy.js';
import { resolveAccountAccess } from '../../common/auth/account-access.policy.js';
import { isSessionAuthMethodAllowed } from '../../common/auth/password-session.policy.js';
import { normalizePhoneDigits, isPhoneShapeValid } from '../../common/auth/phone-shape.js';
import { demoAccountService } from './demo-account.service.js';
import { freshenUserContext, generateTokensWithContext, injectRolesIntoPublicData } from './auth-context.helper.js';
import { emailAuthService } from './email-auth.service.js';
import { kakaoIdentityService, type KakaoIdentityService, type VerifiedKakaoIdentity } from './kakao-identity.service.js';
import { socialFlowService, type SocialFlowService } from './social-flow.service.js';
import { SocialAuthError } from './social-auth-error.js';

export interface KakaoSignupInput { email: string; name: string; phone: string; consents: { terms: boolean; privacy: boolean; marketing?: boolean; termsPolicy?: SignupTermsReference } }
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
    const email=normalizeLoginEmail(input.email);
    if (!isLoginEmailShapeValid(email)) throw new SocialAuthError('INVALID_EMAIL','이메일 주소를 확인해 주세요.');
    if (!input.name?.trim() || input.name.trim().length>100) throw new SocialAuthError('INVALID_NAME','이름을 100자 이내로 입력해 주세요.');
    if (!isPhoneShapeValid(input.phone)) throw new SocialAuthError('INVALID_PHONE','개인 휴대전화 번호를 입력해 주세요.');
    if (!input.consents?.terms || !input.consents?.privacy) throw new SocialAuthError('CONSENT_REQUIRED','이용약관과 개인정보 처리방침에 동의해 주세요.');
    let serviceKey='';
    try {
      const user=await this.db.transaction(async manager=>{
        const flow=await this.flows.consume(token,binding,'kakao-signup',origin,undefined,manager);serviceKey=flow.service_key;
        const identity=flow.payload as unknown as VerifiedKakaoIdentity;
        if (!identity.providerId) throw new SocialAuthError('SOCIAL_FLOW_INVALID','인증을 다시 시작해 주세요.',401);
        if (await demoAccountService.isDemoLoginEmail(email,manager)) throw new SocialAuthError('DEMO_ACCOUNT_FORBIDDEN','테스트 계정의 인증 수단은 변경할 수 없습니다.',403);
        const duplicate: unknown[] = await manager.query('SELECT 1 FROM users WHERE lower(email)=$1 LIMIT 1',[email]);
        if (duplicate.length) throw new SocialAuthError('EMAIL_IN_USE','이미 사용 중인 이메일입니다. 기존 계정으로 로그인한 뒤 명시적으로 연결해 주세요.',409);
        const now=new Date();const repo=manager.getRepository(User);
        const created=repo.create({email,name:input.name.trim(),phone:normalizePhoneDigits(input.phone),
          status:UserStatus.ACTIVE,isActive:true,isEmailVerified:identity.emailVerified===true&&normalizeLoginEmail(identity.email??'')===email,
          tosAcceptedAt:now,privacyAcceptedAt:now,marketingAccepted:input.consents.marketing===true});
        await repo.save(created);
        await manager.getRepository(LinkedAccount).save(manager.getRepository(LinkedAccount).create({
          userId:created.id,provider:'kakao',providerId:identity.providerId,linkedAt:now,lastUsedAt:now,
        }));
        await recordSignupTerms(created.id, signupPolicyServiceKey(flow.service_key), input.consents.termsPolicy, manager);
        return created;
      });
      return this.sessionOrVerification(user,serviceKey,true);
    } catch(error) {
      if (uniqueViolation(error)) throw new SocialAuthError('SOCIAL_IDENTITY_CONFLICT','이미 등록된 이메일 또는 소셜 계정입니다. 기존 계정으로 로그인해 주세요.',409);
      throw error;
    }
  }

  private async sessionOrVerification(user: User, serviceKey: string, isNewUser: boolean, gateKey?: string | null) {
    if (!user.isActive || resolveAccountAccess(user.status)==='blocked') throw new SocialAuthError('ACCOUNT_NOT_ACTIVE','이용할 수 없는 계정입니다.',403);
    const context=await freshenUserContext(user.id);
    if (!isSessionAuthMethodAllowed('kakao',serviceKey,context.roles)) throw new SocialAuthError('GOOGLE_SESSION_REQUIRED','전체관리자 계정은 Google로 로그인해 주세요.',403);
    if (!user.isEmailVerified) {
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

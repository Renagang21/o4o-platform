import type {DataSource} from 'typeorm';
import type {User} from '../../entities/User.js';
import {resolveAccountAccess} from '../../common/auth/account-access.policy.js';
import {memberWorkspaceAccess} from './central-member-workspace.service.js';
import {assertRecoverableTarget} from './member-identity-guards.js';
import {OperationError} from '../operations/operation-audit.js';

type VerificationTarget=Pick<User,'id'|'email'>;
async function deliverVerification(user:VerificationTarget):Promise<boolean>{
  const {emailAuthService}=await import('../auth/email-auth.service.js');
  // This trusted central action supports social-only members; public resend remains password-scoped.
  return emailAuthService.sendVerificationMail(user as User,'neture');
}
export class MemberVerificationService {
  constructor(private readonly db:DataSource,private readonly deliver=deliverVerification){}
  async request(actor:string,target:string,version:string){
    const user=await this.db.transaction(async m=>{
      const access=await memberWorkspaceAccess(m,actor,true);
      if(!access.edit)throw new OperationError(403,'MEMBER_ADMIN_REQUIRED','회원 정보 확인 권한이 필요합니다.');
      const [row]=await m.query(`SELECT id,email,"isActive" AS active,"isEmailVerified" AS verified,status,
        to_char("updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.US') AS version FROM users WHERE id=$1 FOR UPDATE`,[target]);
      if(!row)throw new OperationError(404,'MEMBER_NOT_FOUND','회원을 찾을 수 없습니다.');
      if(row.version!==version)throw new OperationError(409,'MEMBER_CHANGED','회원 정보가 변경되었습니다. 다시 조회해 주세요.');
      if(row.verified)return null;
      if(!row.active||resolveAccountAccess(row.status)==='blocked')throw new OperationError(409,'ACCOUNT_NOT_ACTIVE','계정 이용 상태를 먼저 확인해 주세요.');
      await assertRecoverableTarget(m,target,access.manageAccount,false);
      return {id:row.id,email:row.email};
    });
    if(!user)return {requested:false,alreadyVerified:true};
    // Mail/token service rechecks address, account status and token family under the user lock.
    if(!await this.deliver(user))throw new OperationError(503,'VERIFICATION_MAIL_UNAVAILABLE','확인 메일을 보내지 못했습니다. 현재 정보와 메일 연결 상태를 확인해 주세요.');
    return {requested:true,alreadyVerified:false};
  }
}

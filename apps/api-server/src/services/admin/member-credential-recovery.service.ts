import {randomBytes,randomUUID} from 'node:crypto';
import type {DataSource} from 'typeorm';
import {passwordCredentialService} from '../auth/password-credential.service.js';
import {assertRecoverableTarget} from './member-identity-guards.js';
import {memberWorkspaceAccess} from './central-member-workspace.service.js';
import {OperationError,operationReason,recordOperation} from '../operations/operation-audit.js';

/** Authenticated Google operator only (route); never adds the first password to a social-only account. */
export class MemberCredentialRecoveryService {
  constructor(private readonly db:DataSource){}
  async issue(actor:string,target:string,input:{version:string;reason:string;evidenceConfirmed:true}){
    const reason=operationReason(input.reason);
    return this.db.transaction(async m=>{
      const access=await memberWorkspaceAccess(m,actor,true);
      if(!access.edit || actor===target)throw new OperationError(403,'MEMBER_RECOVERY_FORBIDDEN','본인 비밀번호는 My Home에서 변경해 주세요.');
      const [user]=await m.query(`SELECT status,"isActive" AS active,"isEmailVerified" AS verified,to_char("updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.US') AS version FROM users WHERE id=$1 FOR UPDATE`,[target]);
      if(!user)throw new OperationError(404,'MEMBER_NOT_FOUND','회원을 찾을 수 없습니다.');
      if(user.version!==input.version)throw new OperationError(409,'MEMBER_CHANGED','회원 정보가 변경되었습니다. 다시 조회해 주세요.');
      if(!user.active || !user.verified || !['active','approved'].includes(user.status))throw new OperationError(409,'ACCOUNT_NOT_ACTIVE','계정 상태와 이메일 확인을 먼저 완료해 주세요.');
      await assertRecoverableTarget(m,target,access.manageAccount);
      if(input.evidenceConfirmed!==true)throw new OperationError(400,'MEMBER_EVIDENCE_REQUIRED','본인 요청과 전달 대상을 확인해 주세요.');
      if(!await passwordCredentialService.hasPassword(target,m))throw new OperationError(409,'PASSWORD_METHOD_REQUIRED','이 회원은 Google·카카오로 로그인합니다.');
      const temporaryPassword='Aa1!'+randomBytes(18).toString('base64url');
      const expiresAt=new Date(Date.now()+24*60*60*1000);
      await passwordCredentialService.setTemporaryPassword(target,temporaryPassword,expiresAt,m);
      await m.query('UPDATE password_reset_tokens SET consumed_at=now() WHERE user_id=$1 AND consumed_at IS NULL',[target]);
      await m.query('UPDATE users SET "refreshTokenFamily"=$2,"updatedAt"=clock_timestamp() WHERE id=$1',[target,randomUUID()]);
      await recordOperation(m,'neture',actor,'member.temporary_password_issued',{targetUserId:target,reason,expiresAt:expiresAt.toISOString()});
      return {temporaryPassword,expiresAt:expiresAt.toISOString()};
    });
  }
}

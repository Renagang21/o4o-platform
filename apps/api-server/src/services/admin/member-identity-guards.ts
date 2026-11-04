import type {EntityManager} from 'typeorm';
import {demoAccountService} from '../auth/demo-account.service.js';
import {OperationError} from '../operations/operation-audit.js';
export async function assertRecoverableTarget(m:Pick<EntityManager,'query'>,target:string,admin:boolean,password=true){
  const roles: Array<{role:string}>=await m.query("SELECT role FROM role_assignments WHERE user_id=$1 AND is_active=true AND (valid_from IS NULL OR valid_from<=statement_timestamp()) AND (valid_until IS NULL OR valid_until>=statement_timestamp()) FOR SHARE",[target]);
  if((password && roles.some(r=>r.role.startsWith('platform:'))) || (!admin && roles.some(r=>/(^|:|_)(admin|operator)$/.test(r.role))))throw new OperationError(403,'PRIVILEGED_ACCOUNT_PROTECTED','운영 권한이 있는 계정의 인증 정보는 이 업무에서 변경할 수 없습니다.');
  if(await demoAccountService.isDemoAccount(target,m))throw new OperationError(403,'DEMO_ACCOUNT_FORBIDDEN','Demo 계정의 인증 정보는 변경할 수 없습니다.');
}

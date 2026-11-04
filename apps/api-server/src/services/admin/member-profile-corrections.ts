import {invalidateEmailAuthLinks} from '../auth/email-auth-token.service.js';
import {randomUUID} from 'node:crypto';
import type {EntityManager} from 'typeorm';
import {normalizeLoginEmail,isLoginEmailShapeValid} from '@o4o/auth-utils';
import {OperationError,recordOperation} from '../operations/operation-audit.js';
import {assertRecoverableTarget} from './member-identity-guards.js';
export interface MemberCorrection {
  name:string;nickname:string;phone:string;reason:string;version:string;
  email?:string;licenseNumber?:string;qualificationVersion?:string|null;evidenceConfirmed?:boolean;
}
const secret=(value:unknown)=>({toPostgres:()=>value,toJSON:()=>'[redacted]'});
export async function correctIdentity(m:EntityManager,actor:string,target:string,before:{email:string},access:{manageAccount:boolean;qualifications:boolean},input:MemberCorrection){
  const email=input.email===undefined?before.email:normalizeLoginEmail(input.email);
  if(!isLoginEmailShapeValid(email))throw new OperationError(400,'INVALID_EMAIL','올바른 이메일을 입력해 주세요.');
  if(email!==before.email){
    await assertRecoverableTarget(m,target,access.manageAccount,false);
    if(input.evidenceConfirmed!==true)throw new OperationError(400,'MEMBER_EVIDENCE_REQUIRED','이메일 정정 근거를 확인해 주세요.');
    const [duplicate]=await m.query('SELECT 1 FROM users WHERE lower(email)=lower($1) AND id<>$2',[secret(email),target]);
    if(duplicate)throw new OperationError(409,'EMAIL_IN_USE','이미 가입된 이메일입니다.');
    await m.query('UPDATE users SET email=$2,"isEmailVerified"=false,"refreshTokenFamily"=$3 WHERE id=$1',[target,secret(email),randomUUID()]);
    await invalidateEmailAuthLinks(m,target);
  }
  await correctLicense(m,actor,target,access.qualifications,input);
  return {emailChanged:email!==before.email};
}
async function correctLicense(m:EntityManager,actor:string,target:string,allowed:boolean,input:MemberCorrection){
  if(input.licenseNumber===undefined)return;
  if(!allowed)throw new OperationError(403,'QUALIFICATION_REVIEWER_REQUIRED','약사 자격 정정 권한이 필요합니다.');
  const license=input.licenseNumber.trim();
  const [prior]=await m.query(`SELECT license_number AS license,to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US') AS version FROM kpa_pharmacist_profiles WHERE user_id=$1`,[target]);
  if(license===(prior?.license??''))return;
  if(!license || license.length>100 || [...license].some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127))throw new OperationError(400,'INVALID_LICENSE_NUMBER','면허번호를 확인해 주세요.');
  if(input.evidenceConfirmed!==true)throw new OperationError(400,'MEMBER_EVIDENCE_REQUIRED','면허 정정 근거를 확인해 주세요.');
  if((prior?.version??null)!==(input.qualificationVersion??null))throw new OperationError(409,'QUALIFICATION_CHANGED','면허 정보가 변경되었습니다. 다시 조회해 주세요.');
  await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[secret('pharmacist-license:'+license)]);
  const [taken]=await m.query("SELECT 1 FROM kpa_pharmacist_profiles WHERE BTRIM(license_number)=$1 AND user_id<>$2 AND qualification_status='approved' AND license_verified=true",[secret(license),target]);
  if(taken)throw new OperationError(409,'LICENSE_REVIEW_REQUIRED','이미 승인된 면허번호입니다.');
  await m.query(`INSERT INTO kpa_pharmacist_profiles(user_id,license_number,license_verified,qualification_status) VALUES($1,$2,false,'pending')
    ON CONFLICT(user_id) DO UPDATE SET license_number=$2,license_verified=false,qualification_status='pending',qualification_reason=NULL,verified_at=NULL,verified_by=NULL,updated_at=clock_timestamp()`,[target,secret(license)]);
  await recordOperation(m,'neture',actor,'member.license_corrected',{targetUserId:target,reason:input.reason,previous:prior?.license??null,next:license});
}

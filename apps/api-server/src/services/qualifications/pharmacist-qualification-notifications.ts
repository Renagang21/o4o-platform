import type { EntityManager } from 'typeorm';
import { centralOperationRoles } from '../admin/central-operation-access.js';
import { centralOperationMenuKeys } from '../admin/central-operation-menu-grants.js';
type Db = Pick<EntityManager, 'query'>;
/** Same transaction as the decision/request. No email, license, evidence or free-text reason in a notification. */
export async function notifyQualification(db: Db, userId: string, status: string, reviewerRequest = false) {
  const targetUrl = reviewerRequest
    ? `https://admin.neture.co.kr/operations/neture/qualifications?q=${encodeURIComponent(userId)}`
    : 'https://neture.co.kr/mypage/profile';
  const persist = (recipient: string, operationMenu?: string) => db.query(
    `INSERT INTO notifications("userId","serviceKey",type,title,message,metadata,channel,"isRead")
     VALUES($1,'neture','custom',$2,$3,$4::jsonb,'in_app',false)`,
    [recipient, reviewerRequest ? '약사 자격 검토 요청' : '약사 자격 처리 안내',
      reviewerRequest ? '새로운 자격 확인 요청이 있습니다. 면허 근거를 확인한 뒤 처리해 주세요.' : '약사 자격 상태가 변경되었습니다. 내 프로필에서 확인해 주세요.',
      JSON.stringify({ event: reviewerRequest ? 'qualification.pharmacist_requested' : 'qualification.pharmacist_changed', status, targetUrl, ...(operationMenu ? { operationMenu } : {}) })],
  );
  if (!reviewerRequest) { await persist(userId); return; }
  const recipients: Array<{ userId: string }> = await db.query(`SELECT DISTINCT user_id AS "userId" FROM role_assignments
    WHERE user_id<>$1 AND is_active=true AND role IN ('platform:super_admin','neture:admin','neture:operator')
    AND (valid_from IS NULL OR valid_from<=now()) AND (valid_until IS NULL OR valid_until>=now())`, [userId]);
  for (const recipient of recipients) {
    const roles = await centralOperationRoles(db,recipient.userId);
    if ((await centralOperationMenuKeys(db,recipient.userId,roles)).includes('neture.qualifications')) await persist(recipient.userId,'neture.qualifications');
  }
}

import type { DataSource } from 'typeorm';
import type { RequestHandler } from 'express';
import { hasBusinessOperatorAccess } from '../neture-pharmacy/services/business-operator-access.js';
import { assertNetureMainMembershipActive } from '../neture/services/neture-main-membership.js';

/** Legal storage namespace only. CarePharm keeps its existing account/session and business membership ledgers. */
export function requireCarePharmLegalScope(dataSource: DataSource, level: 'admin' | 'operator'): RequestHandler {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다.' } });
      await assertNetureMainMembershipActive(dataSource, userId);
      const [business] = await dataSource.query(`SELECT id FROM semi_franchises WHERE key='carepharm' AND status='active'`);
      if (!business || !(await hasBusinessOperatorAccess(dataSource, userId, business.id))) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'CarePharm 담당 운영 권한이 필요합니다.' } });
      }
      if (level === 'admin') {
        const [admin] = await dataSource.query(`SELECT id FROM role_assignments WHERE user_id=$1
          AND role IN ('neture:carepharm_admin','neture:admin') AND is_active=true
          AND (valid_from IS NULL OR valid_from<=now()) AND (valid_until IS NULL OR valid_until>=now())`, [userId]);
        if (!admin) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'CarePharm 약관·법정정보 수정은 담당 관리자만 가능합니다.' } });
      }
      next();
    } catch (error) {
      if (error && typeof error === 'object' && 'httpStatus' in error && 'code' in error) {
        return res.status(Number(error.httpStatus)).json({ success: false, error: { code: error.code, message: (error as Error).message } });
      }
      next(error);
    }
  };
}

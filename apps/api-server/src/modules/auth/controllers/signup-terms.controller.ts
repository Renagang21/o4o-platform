import type { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { policyAcceptanceService, PolicyAcceptanceError } from '../../policy-acceptance/policy-acceptance.service.js';
import { signupPolicyKeyFromOrigin } from '../../../services/auth/signup-policy.service.js';

export class SignupTermsController extends BaseController {
  static async get(req: Request, res: Response) {
    res.set('Cache-Control', 'no-store');
    try {
      const serviceKey = signupPolicyKeyFromOrigin(req.get('origin'));
      const doc = await policyAcceptanceService.getPublishedTermsForService(serviceKey);
      if (!doc) return BaseController.error(res, '게시된 이용약관을 불러올 수 없습니다.', 503, 'POLICY_UNAVAILABLE');
      return BaseController.ok(res, {
        policyDocumentId: doc.id, version: doc.version, title: doc.title,
        termsHref: serviceKey === 'kpa-society' ? 'https://pharmacy.neture.co.kr/policy' : 'https://neture.co.kr/terms',
      });
    } catch (error) {
      if (error instanceof PolicyAcceptanceError) return BaseController.error(res, error.message, error.httpStatus, error.code);
      return BaseController.error(res, '이용약관을 불러오지 못했습니다. 다시 시도해 주세요.', 503, 'POLICY_UNAVAILABLE');
    }
  }
}

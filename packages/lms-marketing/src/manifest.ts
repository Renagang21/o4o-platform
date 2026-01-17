/**
 * LMS Marketing Extension Manifest
 *
 * 역할: 콘텐츠 + 퀴즈 + 설문을 캠페인 컨텍스트로 묶어
 *       시장 반응을 발생시키는 실행 계층
 *
 * 금지사항:
 * - Core Entity 복사 ❌
 * - Core Service 직접 접근 ❌
 * - 독자적 데이터 정의 ❌
 * - 분석/판단/해석 ❌
 */

import type { AppManifest } from '@o4o/types';

export const lmsMarketingManifest: AppManifest = {
  appId: 'lms-marketing',
  name: 'LMS Marketing Extension',
  version: '1.0.0',
  description: 'Campaign execution layer for market response collection',

  type: 'extension',

  dependencies: {
    'lms-core': '^1.0.0',
  },

  permissions: ['lms:read', 'lms:write', 'marketing:admin'],

  routes: [
    // ProductContent
    '/api/v1/lms/marketing/products',
    '/api/v1/lms/marketing/products/:id',
    '/api/v1/lms/marketing/products/:id/publish',

    // QuizCampaign
    '/api/v1/lms/marketing/quiz-campaigns',
    '/api/v1/lms/marketing/quiz-campaigns/:id',
    '/api/v1/lms/marketing/quiz-campaigns/:id/activate',
    '/api/v1/lms/marketing/quiz-campaigns/:id/pause',

    // SurveyCampaign
    '/api/v1/lms/marketing/survey-campaigns',
    '/api/v1/lms/marketing/survey-campaigns/:id',
    '/api/v1/lms/marketing/survey-campaigns/:id/activate',
    '/api/v1/lms/marketing/survey-campaigns/:id/pause',
  ],

  ownsTables: [
    'lms_marketing_product_contents',
    'lms_marketing_quiz_campaigns',
    'lms_marketing_survey_campaigns',
  ],

  lifecycle: {
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
  },
};

export const manifest = lmsMarketingManifest;
export default lmsMarketingManifest;

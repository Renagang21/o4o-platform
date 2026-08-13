/**
 * surveysConsole — K-Cosmetics 운영자 설문 콘솔 어댑터
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-SCREEN-CENSUS-AND-PHARMACYHUB-UX-COMMONIZATION-V1
 *
 * 공통 화면(@o4o/operator-core-ui Surveys module)에 주입할 client/config.
 * 기존 `api/survey` (kcosSurveyApi, serviceKey='k-cosmetics') 계약을 그대로 사용한다.
 * axios 응답이라 `.data` 를 여기서 벗긴다 — 공통 화면은 정규화된 결과만 본다.
 */

import type {
  OperatorSurveysClient,
  OperatorSurveysConfig,
} from '@o4o/operator-core-ui';
import { kcosSurveyApi } from '../../../api/survey';

export const kcosSurveysConsoleClient: OperatorSurveysClient = {
  list: async ({ page, limit }) => {
    const res = await kcosSurveyApi.list({ page, limit });
    return { items: (res.data.data ?? []) as never, total: res.data.total ?? 0 };
  },
  updateStatus: async (id, status) => {
    await kcosSurveyApi.update(id, { status });
  },
  remove: async (id) => {
    await kcosSurveyApi.delete(id);
  },
  create: async (payload) => {
    await kcosSurveyApi.create(payload);
  },
};

export const KCOS_SURVEYS_CONFIG: OperatorSurveysConfig = {
  actionPolicyKey: 'cosmetics:surveys',
  listPath: '/operator/surveys',
  createPath: '/operator/surveys/new',
  accent: {
    headerIcon: 'text-pink-600',
    primaryButton: 'bg-pink-600 hover:bg-pink-700',
    rewardText: 'text-pink-700',
    activeBadge: 'bg-pink-50 text-pink-700',
    focusRing: 'focus:ring-pink-500',
    sectionBg: 'bg-pink-50',
    checkboxAccent: 'accent-pink-600',
    linkText: 'text-pink-600',
  },
};

/**
 * surveysConsole — KPA 운영자 설문 콘솔 어댑터
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-SCREEN-CENSUS-AND-PHARMACYHUB-UX-COMMONIZATION-V1
 *
 * 공통 화면(@o4o/operator-core-ui Surveys module)에 주입할 client/config.
 * 기존 `api/survey` 의 endpoint·payload 계약은 그대로 사용한다 (API 변경 없음).
 * accent 클래스는 tailwind purge 안전을 위해 서비스 소스에 literal 로 둔다.
 */

import type {
  OperatorSurveysClient,
  OperatorSurveysConfig,
} from '@o4o/operator-core-ui';
import { surveyApi } from '../../../api/survey';

export const kpaSurveysConsoleClient: OperatorSurveysClient = {
  list: async ({ page, limit }) => {
    const res = await surveyApi.list({ page, limit });
    return { items: (res.data ?? []) as never, total: res.total ?? 0 };
  },
  updateStatus: async (id, status) => {
    await surveyApi.update(id, { status });
  },
  remove: async (id) => {
    await surveyApi.delete(id);
  },
  create: async (payload) => {
    await surveyApi.create(payload);
  },
};

export const KPA_SURVEYS_CONFIG: OperatorSurveysConfig = {
  actionPolicyKey: 'kpa:surveys',
  listPath: '/operator/surveys',
  createPath: '/operator/surveys/new',
  accent: {
    headerIcon: 'text-slate-600',
    primaryButton: 'bg-emerald-600 hover:bg-emerald-700',
    rewardText: 'text-emerald-700',
    activeBadge: 'bg-green-50 text-green-700',
    focusRing: 'focus:ring-emerald-500',
    sectionBg: 'bg-emerald-50',
    checkboxAccent: 'accent-emerald-600',
    linkText: 'text-emerald-600',
  },
};

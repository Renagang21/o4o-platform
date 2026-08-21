/**
 * surveysConsole — GlycoPharm 운영자 설문 콘솔 어댑터
 *
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1
 *
 * 공통 화면(@o4o/operator-core-ui Surveys module)에 주입할 client/config.
 * 기존 `api/survey` 의 endpoint·payload 계약은 그대로 사용한다 (API 변경 없음).
 *   GET    /api/v1/surveys?serviceKey=glycopharm
 *   PATCH  /api/v1/surveys/:id  (상태 변경)
 *   DELETE /api/v1/surveys/:id
 *
 * KPA 어댑터와의 차이 — GlycoPharm 은 axios 응답을 그대로 돌려주므로
 * 목록 언랩이 `res.data.data` / `res.data.total` 이다 (KPA 는 본문이 이미 언랩돼 있다).
 *
 * accent 클래스는 tailwind purge 안전을 위해 서비스 소스에 literal 로 둔다.
 */

import type {
  OperatorSurveysClient,
  OperatorSurveysConfig,
} from '@o4o/operator-core-ui';
import { glycopharmSurveyApi } from '../../../api/survey';

export const glycopharmSurveysConsoleClient: OperatorSurveysClient = {
  list: async ({ page, limit }) => {
    const res = await glycopharmSurveyApi.list({ page, limit });
    return { items: (res.data.data ?? []) as never, total: res.data.total ?? 0 };
  },
  updateStatus: async (id, status) => {
    await glycopharmSurveyApi.update(id, { status });
  },
  remove: async (id) => {
    await glycopharmSurveyApi.delete(id);
  },
  create: async (payload) => {
    await glycopharmSurveyApi.create(payload);
  },
};

export const GLYCOPHARM_SURVEYS_CONFIG: OperatorSurveysConfig = {
  actionPolicyKey: 'glycopharm:surveys',
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

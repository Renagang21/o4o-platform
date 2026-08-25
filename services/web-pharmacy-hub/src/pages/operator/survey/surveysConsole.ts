/**
 * surveysConsole — Pharmacy-Hub 운영자 설문 콘솔 어댑터
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#97)
 *
 * 화면 본체는 @o4o/operator-core-ui 의 공통 Surveys module 이다
 * (KPA-Society · GlycoPharm · K-Cosmetics 가 이미 같은 화면을 쓴다).
 * 여기서는 client(=PH api client, serviceKey 주입) 와 accent 만 넘긴다.
 * 공통 화면에 서비스 분기를 추가하지 않았고, PH 전용 콘솔 사본도 만들지 않는다.
 *
 * accent 클래스는 tailwind purge 안전을 위해 서비스 소스에 literal 로 둔다
 * (operator-core-ui 는 서비스 tailwind content 글롭에 없다).
 */

import type { OperatorSurveysClient, OperatorSurveysConfig } from '@o4o/operator-core-ui';
import {
  listSurveys,
  createSurvey,
  updateSurvey,
  deleteSurvey,
} from '../../../lib/api/pharmacyHubSurveys';

export const pharmacyHubSurveysConsoleClient: OperatorSurveysClient = {
  list: async ({ page, limit }) => {
    const res = await listSurveys({ page, limit });
    return { items: res.items as never, total: res.total };
  },
  updateStatus: async (id, status) => {
    await updateSurvey(id, { status });
  },
  remove: async (id) => {
    await deleteSurvey(id);
  },
  create: async (payload) => {
    await createSurvey(payload);
  },
};

export const PHARMACY_HUB_SURVEYS_CONFIG: OperatorSurveysConfig = {
  actionPolicyKey: 'pharmacy-hub:surveys',
  listPath: '/operator/surveys',
  createPath: '/operator/surveys/new',
  accent: {
    headerIcon: 'text-slate-600',
    primaryButton: 'bg-teal-600 hover:bg-teal-700',
    rewardText: 'text-teal-700',
    activeBadge: 'bg-teal-50 text-teal-700',
    focusRing: 'focus:ring-teal-500',
    sectionBg: 'bg-teal-50',
    checkboxAccent: 'accent-teal-600',
    linkText: 'text-teal-600',
  },
};

/**
 * OperatorSurveyListPage — 설문조사 관리 (Pharmacy-Hub wrapper)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#97)
 * 화면 본체는 @o4o/operator-core-ui 공통 모듈. endpoint·동작·상태 전이 불변.
 */

import { OperatorSurveyListPage as CommonSurveyListPage } from '@o4o/operator-core-ui';
import { pharmacyHubSurveysConsoleClient, PHARMACY_HUB_SURVEYS_CONFIG } from './surveysConsole';

export default function OperatorSurveyListPage() {
  return (
    <CommonSurveyListPage
      client={pharmacyHubSurveysConsoleClient}
      config={PHARMACY_HUB_SURVEYS_CONFIG}
    />
  );
}

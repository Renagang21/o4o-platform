/**
 * OperatorSurveyCreatePage — 설문 만들기 (Pharmacy-Hub wrapper)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#97)
 * 화면 본체는 @o4o/operator-core-ui 공통 모듈.
 * serviceKey='pharmacy-hub' · ownerType='service_operator' 는 lib/api/pharmacyHubSurveys 가 주입한다.
 */

import { OperatorSurveyCreatePage as CommonSurveyCreatePage } from '@o4o/operator-core-ui';
import { pharmacyHubSurveysConsoleClient, PHARMACY_HUB_SURVEYS_CONFIG } from './surveysConsole';

export default function OperatorSurveyCreatePage() {
  return (
    <CommonSurveyCreatePage
      client={pharmacyHubSurveysConsoleClient}
      config={PHARMACY_HUB_SURVEYS_CONFIG}
    />
  );
}

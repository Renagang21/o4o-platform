/**
 * OperatorSurveyCreatePage — 설문 만들기 (GlycoPharm wrapper)
 *
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1
 * 화면 본체는 @o4o/operator-core-ui 의 공통 모듈. URL·endpoint·payload 불변
 * (serviceKey='glycopharm' · ownerType='service_operator' 는 api/survey 가 주입).
 */

import { OperatorSurveyCreatePage as CommonSurveyCreatePage } from '@o4o/operator-core-ui';
import { glycopharmSurveysConsoleClient, GLYCOPHARM_SURVEYS_CONFIG } from './surveysConsole';

export default function OperatorSurveyCreatePage() {
  return (
    <CommonSurveyCreatePage
      client={glycopharmSurveysConsoleClient}
      config={GLYCOPHARM_SURVEYS_CONFIG}
    />
  );
}

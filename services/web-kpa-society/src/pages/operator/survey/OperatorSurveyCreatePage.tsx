/**
 * OperatorSurveyCreatePage — 설문 만들기 (KPA wrapper)
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-SCREEN-CENSUS-AND-PHARMACYHUB-UX-COMMONIZATION-V1
 * 화면 본체는 @o4o/operator-core-ui 의 공통 모듈. (원본 WO-O4O-SURVEY-POINT-REWARD-PHASE1-V1)
 */

import { OperatorSurveyCreatePage as CommonSurveyCreatePage } from '@o4o/operator-core-ui';
import { kpaSurveysConsoleClient, KPA_SURVEYS_CONFIG } from './surveysConsole';

export default function OperatorSurveyCreatePage() {
  return <CommonSurveyCreatePage client={kpaSurveysConsoleClient} config={KPA_SURVEYS_CONFIG} />;
}

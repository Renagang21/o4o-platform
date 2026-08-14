/**
 * OperatorSurveyListPage — 설문조사 관리 (K-Cosmetics wrapper)
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-SCREEN-CENSUS-AND-PHARMACYHUB-UX-COMMONIZATION-V1
 * 화면 본체는 @o4o/operator-core-ui 공통 모듈. (원본 WO-O4O-KCOSMETICS-OPERATOR-SURVEYS-V1)
 */

import { OperatorSurveyListPage as CommonSurveyListPage } from '@o4o/operator-core-ui';
import { kcosSurveysConsoleClient, KCOS_SURVEYS_CONFIG } from './surveysConsole';

export default function OperatorSurveyListPage() {
  return <CommonSurveyListPage client={kcosSurveysConsoleClient} config={KCOS_SURVEYS_CONFIG} />;
}

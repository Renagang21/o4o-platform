/**
 * OperatorSurveyListPage — 설문조사 관리 (KPA wrapper)
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-SCREEN-CENSUS-AND-PHARMACYHUB-UX-COMMONIZATION-V1
 * 화면 본체는 @o4o/operator-core-ui 의 공통 모듈. 여기서는 api client 와 accent 만 주입한다.
 * (원본 WO-O4O-SURVEY-POINT-REWARD-PHASE1-V1 — URL·동작 불변)
 */

import { OperatorSurveyListPage as CommonSurveyListPage } from '@o4o/operator-core-ui';
import { kpaSurveysConsoleClient, KPA_SURVEYS_CONFIG } from './surveysConsole';

export default function OperatorSurveyListPage() {
  return <CommonSurveyListPage client={kpaSurveysConsoleClient} config={KPA_SURVEYS_CONFIG} />;
}

/**
 * OperatorSurveyListPage — 설문조사 관리 (GlycoPharm wrapper)
 *
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1
 * 화면 본체는 @o4o/operator-core-ui 의 공통 모듈 (KPA · K-Cosmetics 가 이미 사용 중).
 * 여기서는 api client 와 accent 만 주입한다. URL·endpoint·동작 불변.
 */

import { OperatorSurveyListPage as CommonSurveyListPage } from '@o4o/operator-core-ui';
import { glycopharmSurveysConsoleClient, GLYCOPHARM_SURVEYS_CONFIG } from './surveysConsole';

export default function OperatorSurveyListPage() {
  return (
    <CommonSurveyListPage
      client={glycopharmSurveysConsoleClient}
      config={GLYCOPHARM_SURVEYS_CONFIG}
    />
  );
}

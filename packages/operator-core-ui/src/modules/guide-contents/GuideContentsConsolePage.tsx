/**
 * GuideContentsConsolePage — Operator 가이드 콘텐츠 관리 페이지 wrapper.
 *
 * WO-O4O-OPERATOR-COPY-PASTE-WRAPPER-CONSOLIDATION-V1:
 *   4 service (KPA / Neture / GlycoPharm / K-Cosmetics) 의 OperatorGuideContentsPage 가
 *   100% 동일한 config (lms.lesson.editor + 5 sections) 를 24-line 파일에 각각 복사
 *   보관하던 상태를 단일 wrapper 로 통합. service 측은 serviceKey + client 만 주입.
 *
 * 선행: GuideContentsManager (WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1).
 */

import { GuideContentsManager } from './GuideContentsManager';
import type { GuideContentsClient, GuideContentsConfig } from './types';

/**
 * 4 service 가 동일하게 사용하던 default config.
 * service-별 override 가 필요하면 `config` prop 으로 전달한다.
 */
const DEFAULT_LMS_LESSON_EDITOR_CONFIG: GuideContentsConfig = {
  pageKey: 'lms.lesson.editor',
  sections: [
    { key: 'article',    label: '문서' },
    { key: 'video',      label: '동영상' },
    { key: 'quiz',       label: '퀴즈' },
    { key: 'assignment', label: '과제' },
    { key: 'live',       label: '라이브' },
  ],
};

export interface GuideContentsConsolePageProps {
  /** 호출 service 의 canonical key (예: 'kpa-society', 'neture'). */
  serviceKey: string;
  /** service 별 GuideContentsClient (서버 endpoint 가 service-scoped 이므로 service 측이 주입). */
  client: GuideContentsClient;
  /** 기본 config (lms.lesson.editor + 5 sections) override 가 필요할 때만 전달. */
  config?: GuideContentsConfig;
}

export function GuideContentsConsolePage({
  serviceKey,
  client,
  config = DEFAULT_LMS_LESSON_EDITOR_CONFIG,
}: GuideContentsConsolePageProps) {
  return (
    <GuideContentsManager
      serviceKey={serviceKey}
      config={config}
      client={client}
    />
  );
}

/**
 * OperatorGuideContentsPage — /operator/guide-contents (GlycoPharm)
 *
 * WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1
 * 공통 모듈: @o4o/operator-core-ui/modules/guide-contents
 */

import { GuideContentsManager, type GuideContentsConfig } from '@o4o/operator-core-ui/modules/guide-contents';
import { guideClient } from '@/api/guideContent';

const config: GuideContentsConfig = {
  pageKey: 'lms.lesson.editor',
  sections: [
    { key: 'article',    label: '문서' },
    { key: 'video',      label: '동영상' },
    { key: 'quiz',       label: '퀴즈' },
    { key: 'assignment', label: '과제' },
    { key: 'live',       label: '라이브' },
  ],
};

export default function OperatorGuideContentsPage() {
  return <GuideContentsManager serviceKey="glycopharm" config={config} client={guideClient} />;
}
